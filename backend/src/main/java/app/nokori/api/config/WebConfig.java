package app.nokori.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

/**
 * Serialises {@code Page} through a stable DTO ({"content": [...], "page": {...}}) instead of
 * Spring Data's internal shape, so the mobile client can rely on the response contract.
 */
@Configuration
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class WebConfig {
}
