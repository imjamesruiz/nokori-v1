package app.nokori.api.demo;

import app.nokori.api.business.Business;
import app.nokori.api.business.BusinessRepository;
import app.nokori.api.business.BusinessType;
import app.nokori.api.inventory.InventoryItem;
import app.nokori.api.inventory.InventoryItemRepository;
import app.nokori.api.inventory.StarterTemplates;
import app.nokori.api.user.User;
import app.nokori.api.user.UserRepository;
import app.nokori.api.waste.WasteEntry;
import app.nokori.api.waste.WasteEntryRepository;
import app.nokori.api.waste.WasteReason;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the reviewer/demo account described in PRD 13.3 — a business with items and two weeks of
 * waste entries, so App Review (and you, on a fresh database) sees a working dashboard and report
 * instead of empty states.
 *
 * <p>Off by default. Enable with {@code NOKORI_DEMO_ENABLED=true}. Entries are written straight
 * through the repository because the API deliberately refuses to backdate more than a week.
 */
@Component
@ConditionalOnProperty(name = "nokori.demo.enabled", havingValue = "true")
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String DEMO_EMAIL = "demo@nokori.app";
    private static final ZoneId DEMO_ZONE = ZoneId.of("America/Los_Angeles");

    private final UserRepository users;
    private final BusinessRepository businesses;
    private final InventoryItemRepository items;
    private final WasteEntryRepository entries;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoDataSeeder(UserRepository users,
                          BusinessRepository businesses,
                          InventoryItemRepository items,
                          WasteEntryRepository entries,
                          PasswordEncoder passwordEncoder,
                          @Value("${nokori.demo.password:NokoriDemo123!}") String demoPassword) {
        this.users = users;
        this.businesses = businesses;
        this.items = items;
        this.entries = entries;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        if (users.existsByEmailIgnoreCase(DEMO_EMAIL)) {
            log.info("Demo account already present ({})", DEMO_EMAIL);
            return;
        }

        User user = users.save(new User(DEMO_EMAIL, passwordEncoder.encode(demoPassword)));
        Business business = businesses.save(new Business(
                user.getId(), "Sunset Taco Truck", BusinessType.FOOD_TRUCK, "Irvine", "USD", DEMO_ZONE.getId()));

        List<InventoryItem> seeded =
                items.saveAll(StarterTemplates.forBusiness(business.getId(), BusinessType.FOOD_TRUCK));
        Map<String, InventoryItem> byName = seeded.stream()
                .collect(Collectors.toMap(InventoryItem::getName, Function.identity()));

        entries.saveAll(buildEntries(business, user, byName));
        log.info("Seeded demo account {} / {} with {} items and waste history",
                DEMO_EMAIL, demoPassword, seeded.size());
    }

    private List<WasteEntry> buildEntries(Business business, User user, Map<String, InventoryItem> byName) {
        LocalDate today = LocalDate.now(DEMO_ZONE);
        Random random = new Random(20260713L); // fixed seed: the demo looks the same every time
        List<WasteEntry> result = new ArrayList<>();

        for (int daysAgo = 20; daysAgo >= 0; daysAgo--) {
            LocalDate date = today.minusDays(daysAgo);

            // The story the report should tell: tortillas over-prepped every Friday.
            if (date.getDayOfWeek() == DayOfWeek.FRIDAY) {
                result.add(entry(business, user, byName.get("Corn tortillas"), "4.5",
                        WasteReason.OVER_PREPPED, date, "Slow evening at the brewery lot"));
                result.add(entry(business, user, byName.get("Carnitas"), "2.5",
                        WasteReason.OVER_PREPPED, date, null));
            }
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                result.add(entry(business, user, byName.get("Pico de gallo"), "1",
                        WasteReason.EXPIRED_SPOILED, date, "Held over from Saturday"));
            }
            if (random.nextInt(100) < 55) {
                InventoryItem item = pick(random, byName, "Grilled chicken", "Avocado", "Rice", "Shredded cheese");
                WasteReason reason = random.nextInt(100) < 60
                        ? WasteReason.OVER_PREPPED
                        : (random.nextBoolean() ? WasteReason.EXPIRED_SPOILED : WasteReason.TRIM_PREP);
                String quantity = String.valueOf(1 + random.nextInt(3)) + "." + random.nextInt(10);
                result.add(entry(business, user, item, quantity, reason, date, null));
            }
        }
        return result;
    }

    private InventoryItem pick(Random random, Map<String, InventoryItem> byName, String... names) {
        return byName.get(names[random.nextInt(names.length)]);
    }

    private WasteEntry entry(Business business, User user, InventoryItem item, String quantity,
                             WasteReason reason, LocalDate date, String note) {
        return new WasteEntry(
                business.getId(),
                item.getId(),
                new BigDecimal(quantity),
                item.getUnit(),
                item.getCostPerUnit(),
                reason,
                date,
                user.getId(),
                note,
                null);
    }
}
