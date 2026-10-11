package com.medicare.service;

import com.medicare.dto.LoginRequest;
import com.medicare.dto.LoginResponse;
import com.medicare.dto.RegisterRequest;
import com.medicare.entity.Role;
import com.medicare.entity.User;
import com.medicare.exception.InvalidCredentialsException;
import com.medicare.exception.UserAlreadyExistsException;
import com.medicare.repository.UserRepository;
import com.medicare.security.CustomUserDetailsService;
import com.medicare.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       CustomUserDetailsService userDetailsService,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
    }

    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException("A user with email " + email + " already exists");
        }

        // Public registration always creates a PATIENT; admins are seeded.
        User user = new User(request.name().trim(), email,
                passwordEncoder.encode(request.password()), Role.PATIENT);
        User saved = userRepository.save(user);

        return buildLoginResponse(saved);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (BadCredentialsException ex) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));
        return buildLoginResponse(user);
    }

    private LoginResponse buildLoginResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtService.generateToken(userDetails);
        return new LoginResponse(token, "Bearer", user.getId(), user.getName(), user.getEmail(),
                user.getRole(), user.getProfilePhotoUrl());
    }
}
