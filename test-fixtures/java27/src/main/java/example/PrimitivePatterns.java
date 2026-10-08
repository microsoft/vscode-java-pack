package example;

public final class PrimitivePatterns {
    private record Measurement(double value) {}

    static long classify(long value) {
        return switch (value) {
            case int i when i > 0 -> i;
            case long l -> l;
        };
    }

    static int narrow(double value) {
        return value instanceof int i ? i : -1;
    }

    static int recordPattern(Object value) {
        return value instanceof Measurement(int i) ? i : -1;
    }

    public static void main(String[] args) {
        System.out.println(classify(42) + "|" + classify(2147483648L)
                + "|" + narrow(42.0) + "|" + narrow(42.5)
                + "|" + recordPattern(new Measurement(42.0))
                + "|" + recordPattern(new Measurement(42.5)));
    }
}
