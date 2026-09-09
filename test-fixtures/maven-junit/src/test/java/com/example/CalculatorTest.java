package com.example;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class CalculatorTest {

    @Test
    public void testAdd() throws IOException {
        Calculator c = new Calculator();
        assertEquals(5, c.add(2, 3));
        Files.writeString(Path.of("target", "autotest-executed.txt"), "testAdd passed");
    }
}
