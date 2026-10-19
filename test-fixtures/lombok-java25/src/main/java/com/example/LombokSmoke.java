package com.example;

import java.io.DataInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.SuperBuilder;

public class LombokSmoke {
    @Getter
    @RequiredArgsConstructor
    static class RequiredValue {
        private final String value;
    }

    @Getter
    @SuperBuilder
    static class BaseMessage {
        private final String name;
        @Builder.Default
        private final String prefix = "hello";
    }

    @Getter
    @SuperBuilder
    static final class ChildMessage extends BaseMessage {
        private final int count;
        @Builder.Default
        private final String suffix = "world";
    }

    public static void main(String[] args) throws IOException {
        if (Runtime.version().feature() != 25) {
            throw new IllegalStateException("Expected JDK 25, got " + Runtime.version());
        }

        RequiredValue required = new RequiredValue("required");
        ChildMessage message = ChildMessage.builder().name("lombok").count(25).build();
        if (!"required".equals(required.getValue())
                || !"lombok".equals(message.getName())
                || !"hello".equals(message.getPrefix())
                || message.getCount() != 25
                || !"world".equals(message.getSuffix())) {
            throw new IllegalStateException("Lombok constructor, getter or inherited builder failed");
        }

        for (Class<?> type : new Class<?>[] {
                LombokSmoke.class, RequiredValue.class, BaseMessage.class, ChildMessage.class,
                BaseMessage.BaseMessageBuilder.class, ChildMessage.ChildMessageBuilder.class,
                ChildMessage.builder().getClass()
        }) {
            verifyJava25Bytecode(type);
        }

        Path marker = Path.of("target", "lombok-java25-passed.txt");
        Files.createDirectories(marker.getParent());
        String result = "LOMBOK_JAVA25_PASSED runtime=25 classMajor=69 required=required"
                + " name=lombok prefix=hello count=25 suffix=world";
        Files.writeString(marker, result);
        System.out.println(result);
    }

    private static void verifyJava25Bytecode(Class<?> type) throws IOException {
        String resource = "/" + type.getName().replace('.', '/') + ".class";
        try (var stream = type.getResourceAsStream(resource)) {
            if (stream == null) {
                throw new IOException("Missing class resource: " + resource);
            }
            DataInputStream data = new DataInputStream(stream);
            if (data.readInt() != 0xCAFEBABE) {
                throw new IOException("Invalid class file: " + resource);
            }
            data.readUnsignedShort();
            int major = data.readUnsignedShort();
            if (major != 69) {
                throw new IllegalStateException("Expected Java 25 bytecode for " + resource + ", got " + major);
            }
        }
    }
}
