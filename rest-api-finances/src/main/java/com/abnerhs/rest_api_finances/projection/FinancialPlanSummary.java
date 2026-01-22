package com.abnerhs.rest_api_finances.projection;

import java.util.UUID;

public interface FinancialPlanSummary {
    UUID getId();
    String getName();

    OwnerSummary getOwner();
    PartnerSummary getPartner();

    interface OwnerSummary {
        UUID getId();
        String getName();
    }

    interface PartnerSummary {
        UUID getId();
        String getName();
    }
}
