package app.nokori.api.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Base class for API tests. Runs against a real PostgreSQL database (see
 * {@code src/test/resources/application-test.yml}) because the behaviour under test —
 * per-business isolation, Flyway constraints, aggregate SQL — is exactly what an in-memory
 * database would not reproduce.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class ApiIntegrationTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    protected LocalDate today;

    @BeforeEach
    void captureToday() {
        this.today = LocalDate.now(java.time.ZoneId.of("America/Los_Angeles"));
    }

    /** Registers a fresh user and returns their access token. */
    protected String registerUser() throws Exception {
        String email = "owner-" + UUID.randomUUID() + "@example.com";
        String body = mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", "correct horse 42"))))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("accessToken").asText();
    }

    /** Registers a user, gives them a business, and returns the access token. */
    protected String ownerWithBusiness(String businessName) throws Exception {
        String token = registerUser();
        createBusiness(token, businessName);
        return token;
    }

    protected JsonNode createBusiness(String token, String name) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("businessType", "FOOD_TRUCK");
        body.put("city", "Irvine");
        body.put("currency", "USD");
        body.put("timezone", "America/Los_Angeles");
        String response = mvc.perform(post("/businesses?seedStarterItems=false")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }

    protected JsonNode createItem(String token, String name, String costPerUnit) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", name);
        body.put("category", "PROTEIN");
        body.put("unit", "LB");
        body.put("costPerUnit", new BigDecimal(costPerUnit));
        String response = mvc.perform(post("/inventory")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }

    protected JsonNode logWaste(String token, UUID itemId, String quantity, String reason, LocalDate date)
            throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("inventoryItemId", itemId);
        body.put("quantity", new BigDecimal(quantity));
        body.put("reason", reason);
        if (date != null) {
            body.put("wasteDate", date.toString());
        }
        String response = mvc.perform(post("/waste-entries")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        return json.readTree(response);
    }

    protected static UUID id(JsonNode node) {
        return UUID.fromString(node.get("id").asText());
    }
}
