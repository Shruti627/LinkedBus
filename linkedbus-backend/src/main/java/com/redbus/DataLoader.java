//package com.redbus;
//
//import com.redbus.model.Bus;
//import com.redbus.service.BusService;
//import org.springframework.boot.CommandLineRunner;
//import org.springframework.stereotype.Component;
//
//@Component
//public class DataLoader implements CommandLineRunner {
//
//    private final BusService busService;
//
//    public DataLoader(BusService busService) {
//        this.busService = busService;
//    }
//
//    @Override
//    public void run(String... args) {
//        try {
//            if (busService.getAll().isEmpty()) {
//                System.out.println("🚍 Adding demo buses (DB handles departure_date)...");
//
//                Bus b1 = new Bus();
//                b1.setBusName("LinkCode Express");
//                b1.setBusType("AC Seater");
//                b1.setSource("Pune");
//                b1.setDestination("Mumbai");
//                b1.setDepartureTime("06:00 AM");
//                b1.setArrivalTime("10:30 AM");
//                b1.setPrice(550.0);
//                // ❌ no need to set departureDate — DB handles it
//                busService.addBus(b1);
//
//                Bus b2 = new Bus();
//                b2.setBusName("Raatrani Express");
//                b2.setBusType("AC Sleeper");
//                b2.setSource("Pune");
//                b2.setDestination("Nagpur");
//                b2.setDepartureTime("08:30 PM");
//                b2.setArrivalTime("06:00 AM");
//                b2.setPrice(1200.0);
//                busService.addBus(b2);
//
//                Bus b3 = new Bus();
//                b3.setBusName("Goa Express");
//                b3.setBusType("Non-AC Seater");
//                b3.setSource("Mumbai");
//                b3.setDestination("Goa");
//                b3.setDepartureTime("09:00 PM");
//                b3.setArrivalTime("07:30 AM");
//                b3.setPrice(900.0);
//                busService.addBus(b3);
//
//                Bus b4 = new Bus();
//                b4.setBusName("Mumbai Express");
//                b4.setBusType("AC Seater");
//                b4.setSource("Nashik");
//                b4.setDestination("Mumbai");
//                b4.setDepartureTime("05:00 AM");
//                b4.setArrivalTime("09:00 AM");
//                b4.setPrice(400.0);
//                busService.addBus(b4);
//
//                Bus b5 = new Bus();
//                b5.setBusName("Shivneri Deluxe");
//                b5.setBusType("AC Sleeper");
//                b5.setSource("Pune");
//                b5.setDestination("Hyderabad");
//                b5.setDepartureTime("09:30 PM");
//                b5.setArrivalTime("07:00 AM");
//                b5.setPrice(1100.0);
//                busService.addBus(b5);
//
//                busService.getAll().forEach(bus -> {
//                    try {
//                        busService.generateSeatsForBus(bus.getId(), 30, bus.getPrice());
//                        System.out.println("✅ 30 seats generated for: " + bus.getBusName());
//                    } catch (Exception e) {
//                        System.out.println("⚠️ Error generating seats for " + bus.getBusName() + ": " + e.getMessage());
//                    }
//                });
//
//                System.out.println("🎉 Demo buses added successfully!");
//            } else {
//                System.out.println("ℹ️ Bus data already exists — skipping creation.");
//            }
//
//        } catch (Exception e) {
//            System.out.println("⚠️ Error while loading initial data: " + e.getMessage());
//        }
//    }
//}
