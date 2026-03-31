package com.redbus.repository;

import com.redbus.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    // Get all seats for a specific bus
    List<Seat> findByBusId(Long busId);

    // 🆕 Efficiently delete all seats of a bus in one SQL statement
    void deleteAllByBusId(Long busId);

    // Lock a single seat when booking (to avoid double booking)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.id = :seatId")
    Optional<Seat> findByIdForUpdate(@Param("seatId") Long seatId);

    // Lock multiple seats in a single query (recommended: use this to fetch & lock all seats at once)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.id IN :seatIds")
    List<Seat> findAllByIdForUpdate(@Param("seatIds") List<Long> seatIds);

    // Lookup seat by its seat number/label within a bus (e.g., "S7")
    Optional<Seat> findBySeatNumberAndBusId(String seatNumber, Long busId);
}
