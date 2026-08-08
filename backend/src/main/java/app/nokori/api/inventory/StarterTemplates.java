package app.nokori.api.inventory;

import app.nokori.api.business.BusinessType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Seed items per business type so first-run setup takes two minutes instead of twenty
 * (PRD F-003 seed helper). Costs are placeholders the owner is expected to correct.
 */
public final class StarterTemplates {

    private StarterTemplates() {
    }

    private record Seed(String name, ItemCategory category, ItemUnit unit, String cost) {
    }

    private static final List<Seed> FOOD_TRUCK = List.of(
            new Seed("Carnitas", ItemCategory.PROTEIN, ItemUnit.LB, "6.50"),
            new Seed("Grilled chicken", ItemCategory.PROTEIN, ItemUnit.LB, "4.25"),
            new Seed("Corn tortillas", ItemCategory.BAKED, ItemUnit.DOZEN, "1.20"),
            new Seed("Rice", ItemCategory.PREPARED, ItemUnit.BATCH, "3.00"),
            new Seed("Pico de gallo", ItemCategory.PREPARED, ItemUnit.BATCH, "4.00"),
            new Seed("Shredded cheese", ItemCategory.DAIRY, ItemUnit.LB, "3.75"),
            new Seed("Avocado", ItemCategory.PRODUCE, ItemUnit.EACH, "1.10"));

    private static final List<Seed> CAFE = List.of(
            new Seed("Croissant", ItemCategory.BAKED, ItemUnit.EACH, "1.15"),
            new Seed("Blueberry muffin", ItemCategory.BAKED, ItemUnit.EACH, "0.95"),
            new Seed("Drip coffee", ItemCategory.BEVERAGE, ItemUnit.BATCH, "2.40"),
            new Seed("Whole milk", ItemCategory.DAIRY, ItemUnit.GALLON, "4.60"),
            new Seed("Oat milk", ItemCategory.DAIRY, ItemUnit.LITER, "2.80"),
            new Seed("Breakfast sandwich", ItemCategory.PREPARED, ItemUnit.EACH, "2.20"),
            new Seed("Cut fruit", ItemCategory.PRODUCE, ItemUnit.LB, "2.50"));

    private static final List<Seed> BAKERY = List.of(
            new Seed("Sourdough loaf", ItemCategory.BAKED, ItemUnit.EACH, "2.10"),
            new Seed("Baguette", ItemCategory.BAKED, ItemUnit.EACH, "1.30"),
            new Seed("Chocolate chip cookie", ItemCategory.BAKED, ItemUnit.EACH, "0.55"),
            new Seed("Cinnamon roll", ItemCategory.BAKED, ItemUnit.EACH, "1.05"),
            new Seed("Laminated dough", ItemCategory.PREPARED, ItemUnit.TRAY, "8.00"),
            new Seed("Butter", ItemCategory.DAIRY, ItemUnit.LB, "4.20"),
            new Seed("Heavy cream", ItemCategory.DAIRY, ItemUnit.LITER, "3.60"));

    private static final List<Seed> RESTAURANT = List.of(
            new Seed("Chicken breast", ItemCategory.PROTEIN, ItemUnit.LB, "4.10"),
            new Seed("Ground beef", ItemCategory.PROTEIN, ItemUnit.LB, "5.20"),
            new Seed("Mixed greens", ItemCategory.PRODUCE, ItemUnit.LB, "3.40"),
            new Seed("Tomatoes", ItemCategory.PRODUCE, ItemUnit.LB, "2.15"),
            new Seed("House sauce", ItemCategory.PREPARED, ItemUnit.BATCH, "6.00"),
            new Seed("Fries", ItemCategory.PREPARED, ItemUnit.LB, "1.35"),
            new Seed("Shredded cheese", ItemCategory.DAIRY, ItemUnit.LB, "3.75"));

    private static final List<Seed> CATERER = List.of(
            new Seed("Buffet chicken", ItemCategory.PROTEIN, ItemUnit.TRAY, "34.00"),
            new Seed("Vegetable medley", ItemCategory.PRODUCE, ItemUnit.TRAY, "18.00"),
            new Seed("Dinner rolls", ItemCategory.BAKED, ItemUnit.DOZEN, "4.50"),
            new Seed("Green salad", ItemCategory.PRODUCE, ItemUnit.TRAY, "16.00"),
            new Seed("Pasta", ItemCategory.PREPARED, ItemUnit.TRAY, "22.00"),
            new Seed("Dessert bars", ItemCategory.BAKED, ItemUnit.TRAY, "26.00"));

    public static List<InventoryItem> forBusiness(UUID businessId, BusinessType type) {
        List<Seed> seeds = switch (type) {
            case FOOD_TRUCK -> FOOD_TRUCK;
            case CAFE -> CAFE;
            case BAKERY -> BAKERY;
            case RESTAURANT -> RESTAURANT;
            case CATERER -> CATERER;
            case OTHER -> List.of();
        };
        return seeds.stream()
                .map(seed -> new InventoryItem(businessId, seed.name(), seed.category(), seed.unit(),
                        new BigDecimal(seed.cost())))
                .toList();
    }
}
