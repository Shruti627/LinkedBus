package com.redbus.repository;

import com.redbus.model.SupportReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupportReportRepository extends JpaRepository<SupportReport, Long> {
    
}
