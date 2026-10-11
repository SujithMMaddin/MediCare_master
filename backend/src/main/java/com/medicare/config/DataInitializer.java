package com.medicare.config;

import com.medicare.entity.Availability;
import com.medicare.entity.Doctor;
import com.medicare.entity.Role;
import com.medicare.entity.Specialization;
import com.medicare.entity.User;
import com.medicare.repository.AvailabilityRepository;
import com.medicare.repository.DoctorRepository;
import com.medicare.repository.SpecializationRepository;
import com.medicare.repository.UserRepository;
import com.medicare.service.BillingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.List;

@Configuration
public class DataInitializer {

    private static final Logger log =
            LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    CommandLineRunner seedData(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            SpecializationRepository specializationRepository,
            AvailabilityRepository availabilityRepository,
            BillingService billingService,
            PasswordEncoder passwordEncoder,

            @Value("${app.admin.name}")
            String adminName,

            @Value("${app.admin.email}")
            String adminEmail,

            @Value("${app.admin.password}")
            String adminPassword) {

        return args -> {

            // -----------------------------
            // ADMIN
            // -----------------------------

            if (!userRepository.existsByEmail(adminEmail)) {

                userRepository.save(
                        new User(
                                adminName,
                                adminEmail,
                                passwordEncoder.encode(adminPassword),
                                Role.ADMIN
                        )
                );

                log.info("Default admin created: {}", adminEmail);
            }

            // -----------------------------
            // SPECIALIZATIONS
            // -----------------------------

            Specialization cardiology =
                    createSpecialization(
                            "Cardiology",
                            specializationRepository);

            Specialization neurology =
                    createSpecialization(
                            "Neurology",
                            specializationRepository);

            Specialization pediatrics =
                    createSpecialization(
                            "Pediatrics",
                            specializationRepository);

            Specialization orthopedics =
                    createSpecialization(
                            "Orthopedics",
                            specializationRepository);

            Specialization dermatology =
                    createSpecialization(
                            "Dermatology",
                            specializationRepository);

            Specialization generalMedicine =
                    createSpecialization(
                            "General Medicine",
                            specializationRepository);

            // -----------------------------
            // SAMPLE DOCTORS
            // -----------------------------

            if (doctorRepository.count() == 0) {

                Doctor anita = createDoctor(
                        "Dr. Anita Sharma",
                        "anita@medicare.com",
                        "doctor123",
                        cardiology,
                        userRepository,
                        doctorRepository,
                        passwordEncoder
                );

                Doctor rajesh = createDoctor(
                        "Dr. Rajesh Kumar",
                        "rajesh@medicare.com",
                        "doctor123",
                        neurology,
                        userRepository,
                        doctorRepository,
                        passwordEncoder
                );

                Doctor priya = createDoctor(
                        "Dr. Priya Nair",
                        "priya@medicare.com",
                        "doctor123",
                        pediatrics,
                        userRepository,
                        doctorRepository,
                        passwordEncoder
                );

                Doctor arjun = createDoctor(
                        "Dr. Arjun Mehta",
                        "arjun@medicare.com",
                        "doctor123",
                        orthopedics,
                        userRepository,
                        doctorRepository,
                        passwordEncoder
                );

                Doctor sneha = createDoctor(
                        "Dr. Sneha Reddy",
                        "sneha@medicare.com",
                        "doctor123",
                        dermatology,
                        userRepository,
                        doctorRepository,
                        passwordEncoder
                );

                Doctor vikram = createDoctor(
                        "Dr. Vikram Singh",
                        "vikram@medicare.com",
                        "doctor123",
                        generalMedicine,
                        userRepository,
                        doctorRepository,
                        passwordEncoder
                );

                // Anita
                addWeekdayAvailability(
                        anita,
                        9,
                        13,
                        availabilityRepository);

                // Rajesh
                addAvailability(
                        rajesh,
                        DayOfWeek.MONDAY,
                        10,
                        16,
                        availabilityRepository);

                addAvailability(
                        rajesh,
                        DayOfWeek.TUESDAY,
                        10,
                        16,
                        availabilityRepository);

                addAvailability(
                        rajesh,
                        DayOfWeek.WEDNESDAY,
                        10,
                        16,
                        availabilityRepository);

                // Priya
                addWeekdayAvailability(
                        priya,
                        9,
                        14,
                        availabilityRepository);

                // Arjun
                addAvailability(
                        arjun,
                        DayOfWeek.TUESDAY,
                        11,
                        17,
                        availabilityRepository);

                addAvailability(
                        arjun,
                        DayOfWeek.WEDNESDAY,
                        11,
                        17,
                        availabilityRepository);

                addAvailability(
                        arjun,
                        DayOfWeek.THURSDAY,
                        11,
                        17,
                        availabilityRepository);

                addAvailability(
                        arjun,
                        DayOfWeek.FRIDAY,
                        11,
                        17,
                        availabilityRepository);

                addAvailability(
                        arjun,
                        DayOfWeek.SATURDAY,
                        11,
                        17,
                        availabilityRepository);

                // Sneha
                addWeekdayAvailability(
                        sneha,
                        14,
                        18,
                        availabilityRepository);

                // Vikram
                addAllWeekAvailability(
                        vikram,
                        8,
                        20,
                        availabilityRepository);

                log.info("Sample doctors and availability created");
            }
            billingService.createMissingRecords();
        };
    }

    private Specialization createSpecialization(
            String name,
            SpecializationRepository repository) {

        Specialization specialization = repository.findByNameIgnoreCase(name)
                .orElseGet(() -> new Specialization(name));
        if (specialization.getConsultationFee() == null) {
            specialization.setConsultationFee(new BigDecimal("500.00"));
        }
        return repository.save(specialization);
    }

    private Doctor createDoctor(
            String name,
            String email,
            String password,
            Specialization specialization,
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            PasswordEncoder passwordEncoder) {

        User user = userRepository.findByEmail(email)
                .orElseGet(() ->
                        userRepository.save(
                                new User(
                                        name,
                                        email,
                                        passwordEncoder.encode(password),
                                        Role.DOCTOR
                                )
                        )
                );

        return doctorRepository.save(
                new Doctor(user, specialization));
    }

    private void addWeekdayAvailability(
            Doctor doctor,
            int startHour,
            int endHour,
            AvailabilityRepository repository) {

        List<DayOfWeek> weekdays = List.of(
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY
        );

        for (DayOfWeek day : weekdays) {
            addAvailability(
                    doctor,
                    day,
                    startHour,
                    endHour,
                    repository);
        }
    }

    private void addAllWeekAvailability(
            Doctor doctor,
            int startHour,
            int endHour,
            AvailabilityRepository repository) {

        for (DayOfWeek day : DayOfWeek.values()) {
            addAvailability(
                    doctor,
                    day,
                    startHour,
                    endHour,
                    repository);
        }
    }

    private void addAvailability(
            Doctor doctor,
            DayOfWeek day,
            int startHour,
            int endHour,
            AvailabilityRepository repository) {

        Availability availability = new Availability(
                doctor,
                day,
                LocalTime.of(startHour, 0),
                LocalTime.of(endHour, 0),
                30
        );

        repository.save(availability);
    }
}