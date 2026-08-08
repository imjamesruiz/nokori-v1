package app.nokori.api.waste;

public enum WasteReason {
    OVER_PREPPED("Over-prepped"),
    EXPIRED_SPOILED("Expired / spoiled"),
    BURNED_DAMAGED("Burned / damaged"),
    CUSTOMER_RETURN("Customer return"),
    TRIM_PREP("Trim / prep waste"),
    OTHER("Other");

    private final String label;

    WasteReason(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
