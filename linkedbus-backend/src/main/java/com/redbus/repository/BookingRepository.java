package com.redbus.repository;

import com.redbus.model.Booking;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "bus", "seats"})
    List<Booking> findWithRelationsByUserId(Long userId);

    @Query("""
        SELECT b FROM Booking b
        LEFT JOIN FETCH b.user
        LEFT JOIN FETCH b.bus
        LEFT JOIN FETCH b.seats
        WHERE b.id = :bookingId
        """)
    Optional<Booking> findByIdWithUserAndRelations(@Param("bookingId") Long bookingId);

    @Query("SELECT b.user.name FROM Booking b WHERE b.id = :bookingId")
    Optional<String> findUserNameByBookingId(@Param("bookingId") Long bookingId);

    // Correct method: order by bookingTime (matches Booking.bookingTime)
    List<Booking> findAllByOrderByBookingTimeDesc(Pageable pageable);

    long countByBookingTimeBetween(LocalDateTime start, LocalDateTime end);

    // Sum of BigDecimal will return BigDecimal
    @Query("select sum(b.totalFare) from Booking b where b.bookingTime >= :start and b.bookingTime <= :end")
    BigDecimal sumTotalFareBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * NEW:
     * Find booking by linked payment record id.
     * This assumes your Booking entity has a field like `private Long paymentRecordId;`
     * If you chose to store the link on Payment side instead, implement a JPQL join instead.
     */
    @EntityGraph(attributePaths = {"user", "bus", "seats"})
    Optional<Booking> findByPaymentRecordId(Long paymentRecordId);
}
