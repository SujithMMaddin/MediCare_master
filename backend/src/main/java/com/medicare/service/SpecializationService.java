package com.medicare.service;

import com.medicare.entity.Specialization;
import com.medicare.dto.FeeRequest;
import com.medicare.repository.SpecializationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SpecializationService {

    private final SpecializationRepository specializationRepository;

    public SpecializationService(
            SpecializationRepository specializationRepository) {
        this.specializationRepository = specializationRepository;
    }

    @Transactional(readOnly = true)
    public List<Specialization> getAll() {
        return specializationRepository.findAll();
    }

    @Transactional
    public Specialization updateConsultationFee(Long id, FeeRequest request) {
        Specialization specialization = specializationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Specialization not found"));
        specialization.setConsultationFee(request.consultationFee());
        return specializationRepository.save(specialization);
    }

    @Transactional
    public Specialization create(String name) {

        String cleanedName = name.trim();

        if (specializationRepository.existsByNameIgnoreCase(cleanedName)) {
            throw new IllegalArgumentException(
                    "Specialization already exists");
        }

        return specializationRepository.save(
                new Specialization(cleanedName));
    }

    @Transactional
    public void delete(Long id) {

        Specialization specialization =
                specializationRepository.findById(id)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Specialization not found"));

        specializationRepository.delete(specialization);
    }
}