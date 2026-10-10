package example;

import org.apache.commons.lang3.StringUtils;

public class GradleSmoke25 {
    public static void main(String[] args) {
        String dependency = StringUtils.upperCase("gradle");
        ScopedValue<String> value = ScopedValue.newInstance();
        String result = ScopedValue.where(value, dependency).call(value::get);
        System.out.println("GRADLE_PROJECT:" + Runtime.version().feature() + ":" + result);
    }
}
