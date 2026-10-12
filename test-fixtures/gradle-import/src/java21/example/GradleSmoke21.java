package example;

import org.apache.commons.lang3.StringUtils;

public class GradleSmoke21 {
    public static void main(String[] args) {
        String dependency = StringUtils.upperCase("gradle");
        System.out.println("GRADLE_PROJECT:" + Runtime.version().feature() + ":" + dependency);
    }
}
