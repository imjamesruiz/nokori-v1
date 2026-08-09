package app.nokori.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

// Authentication is JWT-only, so Spring Security's default in-memory user is excluded rather
// than left to generate a password on every boot.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
@EnableScheduling
public class NokoriApplication {

    public static void main(String[] args) {
        SpringApplication.run(NokoriApplication.class, args);
    }
}
