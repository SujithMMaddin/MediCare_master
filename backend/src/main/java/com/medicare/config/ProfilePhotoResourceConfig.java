package com.medicare.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class ProfilePhotoResourceConfig implements WebMvcConfigurer {

    private final String photoDirectory;

    public ProfilePhotoResourceConfig(@Value("${app.profile-photo-directory:${user.dir}/uploads/profile-photos}") String photoDirectory) {
        String location = Path.of(photoDirectory).toAbsolutePath().normalize().toUri().toString();
        this.photoDirectory = location.endsWith("/") ? location : location + "/";
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/profile-photos/**")
                .addResourceLocations(photoDirectory);
    }
}
