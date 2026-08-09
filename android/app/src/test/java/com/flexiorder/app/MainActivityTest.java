package com.flexiorder.app;

import static org.junit.Assert.assertEquals;

import com.getcapacitor.BridgeActivity;

import org.junit.Test;

public class MainActivityTest {

    @Test
    public void mainActivityUsesCapacitorBridge() {
        assertEquals(BridgeActivity.class, MainActivity.class.getSuperclass());
    }
}
