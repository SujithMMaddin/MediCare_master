package com.medicare.config;

import com.medicare.security.CustomUserDetailsService;
import com.medicare.security.JwtAuthenticationFilter;
import com.medicare.security.RestAccessDeniedHandler;
import com.medicare.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@org.springframework.scheduling.annotation.EnableScheduling
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            CustomUserDetailsService userDetailsService,
            RestAuthenticationEntryPoint authenticationEntryPoint,
            RestAccessDeniedHandler accessDeniedHandler,
            @Value("${app.cors.allowed-origins}") String allowedOrigins) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.userDetailsService = userDetailsService;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;

        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .toList();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .csrf(AbstractHttpConfigurer::disable)

                .cors(cors ->
                        cors.configurationSource(corsConfigurationSource()))

                .sessionManagement(sm ->
                        sm.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS))

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))

                .authorizeHttpRequests(auth -> auth

                        // =========================
                        // PUBLIC
                        // =========================

                        .requestMatchers(
                                HttpMethod.OPTIONS,
                                "/**"
                        ).permitAll()

                        .requestMatchers(
                                "/api/auth/**"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/profile-photos/**").permitAll()


                        // =========================
                        // DOCTORS
                        // =========================

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/doctors",
                                "/api/doctors/**"
                        ).permitAll()

                        // Only admin can create/update/delete doctors.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/doctors"
                        ).hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/doctors/*/availability/*")
                        .hasAnyRole("ADMIN", "DOCTOR")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/doctors/**"
                        ).hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/doctors/*/status").hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/doctors/*/fee"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/doctors/**"
                        ).hasRole("ADMIN")


                        // =========================
                        // SPECIALIZATIONS
                        // =========================

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/specializations",
                                "/api/specializations/**"
                        ).permitAll()

                        .requestMatchers("/api/patient-profiles/**").hasRole("PATIENT")

                        // Only admin can manage specializations.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/specializations"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/specializations/**"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/specializations/*/fee"
                        ).hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/profile/doctor-details").hasRole("DOCTOR")
                        .requestMatchers("/api/profile/**").authenticated()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/billing/appointments/**"
                        ).authenticated()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/billing"
                        ).hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/billing/**"
                        ).hasRole("ADMIN")

                        // =========================
                        // DOCTOR AVAILABILITY
                        // =========================

                        // Admin manages doctor availability.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/doctors/*/availability"
                        ).hasAnyRole("ADMIN", "DOCTOR")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/doctors/*/availability/**"
                        ).hasAnyRole("ADMIN", "DOCTOR")

                        // Anyone authenticated can view availability.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/doctors/*/availability"
                        ).authenticated()


                        // =========================
                        // PATIENT APPOINTMENTS
                        // =========================

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/appointments"
                        ).hasRole("PATIENT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/appointments/my"
                        ).hasRole("PATIENT")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/appointments/*/cancel"
                        ).hasRole("PATIENT")

                        .requestMatchers(HttpMethod.PUT, "/api/appointments/*/reschedule").hasRole("PATIENT")

                        .requestMatchers(HttpMethod.POST, "/api/appointments/*/reviews").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/api/reviews/my").hasRole("PATIENT")


                        // =========================
                        // DOCTOR APPOINTMENTS
                        // =========================

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/appointments/doctor/my"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/appointments/*/confirm"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/appointments/*/reject"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/appointments/*/complete"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/appointments/*/no-show"
                        ).hasRole("DOCTOR")


                        // =========================
                        // ADMIN APPOINTMENTS
                        // =========================

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/appointments/all"
                        ).hasRole("ADMIN")

                        .requestMatchers("/api/fee-change-requests/my").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.POST, "/api/fee-change-requests").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/api/fee-change-requests").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/fee-change-requests/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/doctor/leaves/admin").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/doctor/leaves/*/decision").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/doctor/leaves/admin/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/doctor/leaves").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.POST, "/api/doctor/leaves").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/doctor/leaves/*").hasRole("DOCTOR")
                        .requestMatchers("/api/doctor/leaves", "/api/doctor/leaves/**").denyAll()

                        .requestMatchers(HttpMethod.GET, "/api/doctors/*/reviews").permitAll()
                        .requestMatchers("/api/reviews/admin", "/api/reviews/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/admin/reports/**").hasRole("ADMIN")

                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/patient-history").hasAnyRole("ADMIN", "DOCTOR")


                        // =========================
                        // EVERYTHING ELSE
                        // =========================

                        .anyRequest().authenticated()
                )

                .authenticationProvider(authenticationProvider())

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    /*
     * The JWT filter only runs inside the Spring Security chain,
     * not as a plain servlet filter.
     */
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter>
    jwtFilterRegistration(JwtAuthenticationFilter filter) {

        FilterRegistrationBean<JwtAuthenticationFilter> registration =
                new FilterRegistrationBean<>(filter);

        registration.setEnabled(false);

        return registration;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider();

        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());

        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration)
            throws Exception {

        return configuration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(allowedOrigins);

        config.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "DELETE",
                        "OPTIONS"
                )
        );

        config.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type",
                        "Accept"
                )
        );

        config.setExposedHeaders(
                List.of("Authorization")
        );

        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
