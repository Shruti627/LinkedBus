package com.redbus.repository;

import com.redbus.model.Bus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BusRepository extends JpaRepository<Bus, Long> {

    // ✅ For user searches
    List<Bus> findBySourceIgnoreCaseAndDestinationIgnoreCase(String source, String destination);

    List<Bus> findBySourceIgnoreCaseAndDestinationIgnoreCaseAndDepartureDate(
            String source,
            String destination,
            LocalDate departureDate
    );

    // ✅ Count all buses (for admin dashboard)
    @Query("SELECT COUNT(b) FROM Bus b")
    long countAllBuses();

    // ✅ Count active buses (case-insensitive, works for all cases)
    @Query("SELECT COUNT(b) FROM Bus b WHERE LOWER(b.status) = 'active'")
    long countActiveBuses();

    // ✅ Upcoming active buses
    @Query("""
        SELECT b FROM Bus b
        WHERE LOWER(b.status) = 'active'
          AND b.departureDate >= CURRENT_DATE
        ORDER BY b.departureDate ASC
    """)
    List<Bus> findUpcomingActiveBuses();

    // ✅ For detailed route-based queries
    @Query("""
        SELECT DISTINCT b FROM Bus b
        LEFT JOIN FETCH b.seats s
        WHERE UPPER(b.source) = UPPER(:source)
          AND UPPER(b.destination) = UPPER(:destination)
          AND b.departureDate = :date
    """)
    List<Bus> findByRouteWithDetails(
            @Param("source") String source,
            @Param("destination") String destination,
            @Param("date") LocalDate date
    );
}
