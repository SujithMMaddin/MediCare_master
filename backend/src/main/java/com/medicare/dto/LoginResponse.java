package com.medicare.dto;

import com.medicare.entity.Role;

public record LoginResponse(
        String token,
        String type,
        Long id,
        String name,
        String email,
        Role role,
        String profilePhotoUrl
) {
}
