package com.redbus.adminservice;

import com.redbus.admindto.BusResponse;
import com.redbus.admindto.CreateBusRequest;
import com.redbus.admindto.UpdateBusRequest;

import java.util.List;

public interface AdminBusService {
    List<com.redbus.admindto.BusResponse> listBuses();
    BusResponse createBus(CreateBusRequest req);
    BusResponse updateBus(Long id, UpdateBusRequest req);
    void deleteBus(Long id);
    BusResponse toggleActive(Long id);

    // new:
    long countBuses();
    long countActiveBuses();
}
