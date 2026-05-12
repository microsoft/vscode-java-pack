package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class CalculatorTest {

    @Test
    public void testAdd() {
        Calculator c = new Calculator();
        assertEquals(5, c.add(2, 3));
    }
}
