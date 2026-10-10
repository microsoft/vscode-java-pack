package example;

import java.lang.LazyConstant;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public final class Java27Apis {
    public static void main(String[] args) {
        AtomicInteger initializations = new AtomicInteger();
        LazyConstant<String> value = LazyConstant.of(() -> {
            initializations.incrementAndGet();
            return "jdk27";
        });
        AtomicInteger membershipChecks = new AtomicInteger();
        Set<String> options = Set.ofLazy(Set.of("enabled", "disabled"), name -> {
            membershipChecks.incrementAndGet();
            return name.equals("enabled");
        });
        System.out.println(value.get() + "|" + value.get() + "|" + initializations.get()
                + "|" + options.contains("enabled") + "|" + options.contains("disabled")
                + "|" + options.contains("enabled") + "|" + membershipChecks.get());
    }
}
