package app.nokori.api.report;

/** One actionable sentence plus the rule that produced it, so rule impact stays measurable. */
public record Recommendation(String ruleId, String text) {

    public static final Recommendation NOT_ENOUGH_DATA = new Recommendation(
            "not_enough_data",
            "Keep logging — insights unlock after a week of data.");
}
