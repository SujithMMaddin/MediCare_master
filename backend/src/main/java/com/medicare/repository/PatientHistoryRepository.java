package com.medicare.repository;
import com.medicare.dto.PatientHistoryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import com.medicare.entity.PatientProfile;
public interface PatientHistoryRepository extends Repository<PatientProfile, Long> {
    @Query(value = "select new com.medicare.dto.PatientHistoryResponse(p.id,p.fullName,p.dateOfBirth,p.relationship,a.appointmentDate,a.status,d.user.name,s.name,'') from PatientProfile p left join Appointment a on a.patientProfile=p left join a.doctor d left join d.specialization s where (:admin=true or (d.user.email=:email and a.status=com.medicare.entity.AppointmentStatus.COMPLETED)) and (:name is null or lower(p.fullName) like lower(concat('%',:name,'%'))) and (:doctorId is null or d.id=:doctorId) and (:status is null or str(a.status)=:status) and (:fromDate is null or a.appointmentDate>=:fromDate) and (:toDate is null or a.appointmentDate<:toDate) order by a.appointmentDate desc",
    countQuery = "select count(p) from PatientProfile p left join Appointment a on a.patientProfile=p left join a.doctor d where (:admin=true or (d.user.email=:email and a.status=com.medicare.entity.AppointmentStatus.COMPLETED)) and (:name is null or lower(p.fullName) like lower(concat('%',:name,'%'))) and (:doctorId is null or d.id=:doctorId) and (:status is null or str(a.status)=:status) and (:fromDate is null or a.appointmentDate>=:fromDate) and (:toDate is null or a.appointmentDate<:toDate)")
    Page<PatientHistoryResponse> search(@Param("admin") boolean admin,@Param("email") String email,@Param("name") String name,@Param("doctorId") Long doctorId,@Param("status") String status,@Param("fromDate") LocalDateTime fromDate,@Param("toDate") LocalDateTime toDate,Pageable pageable);
}
