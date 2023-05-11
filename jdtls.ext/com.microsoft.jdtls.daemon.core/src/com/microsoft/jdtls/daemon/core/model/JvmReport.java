/*******************************************************************************
 * Copyright (c) 2023 Microsoft Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *    Microsoft Corporation - initial API and implementation
 *******************************************************************************/
package com.microsoft.jdtls.daemon.core.model;

/**
 * Basic statistics about JVM status.
 */
public class JvmReport {
    /**
     * Milliseconds used for GC in one time window.
     */
    private long gcTime;

    /**
     * Milliseconds used for the process CPU time in one time window.
     */
    private long cpuTime;
    /**
     * Swap load
     */
    private int swapLoad;

    public JvmReport(long gcTime, long cpuTime, int swapLoad) {
        this.gcTime = gcTime;
        this.cpuTime = cpuTime;
        this.swapLoad = swapLoad;
    }

    public long getGcTime() {
        return gcTime;
    }

    public void setGcTime(long gcTime) {
        this.gcTime = gcTime;
    }

    public long getCpuTime() {
        return cpuTime;
    }

    public void setCpuTime(long cpuTime) {
        this.cpuTime = cpuTime;
    }

    public int getSwapLoad() {
        return swapLoad;
    }

    public void setSwapLoad(int swapLoad) {
        this.swapLoad = swapLoad;
    }

    @Override
    public String toString() {
        return "JvmReport [thisGcTime=" + gcTime + ", thisCpuTime=" + cpuTime + ", swapLoad=" + swapLoad + "]";
    }
}
