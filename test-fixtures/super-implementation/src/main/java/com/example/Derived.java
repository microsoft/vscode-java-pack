package com.example;

/**
 * Derived overrides the base method. Hovering the override shows the
 * "Go to super implementation" link that vscode-java contributes; clicking
 * it should jump to the base class.
 */
public class Derived extends Base {

    @Override
    public void greet() {
        System.out.println("Hello from Derived");
    }
}
