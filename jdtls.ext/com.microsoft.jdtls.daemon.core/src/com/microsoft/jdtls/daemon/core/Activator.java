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
package com.microsoft.jdtls.daemon.core;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.eclipse.jdt.ls.core.internal.JavaLanguageServerPlugin;
import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;

import com.sun.management.OperatingSystemMXBean;

import com.microsoft.jdtls.daemon.core.model.JvmReport;

public class Activator implements BundleActivator {

    long startTime;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @Override
    public void start(BundleContext bundleContext) throws Exception {
        startTime = System.nanoTime();
        final Runnable gcSampling = new GcSampling();
        scheduler.scheduleAtFixedRate(gcSampling, 1, 1, TimeUnit.MINUTES);
    }

    @Override
    public void stop(BundleContext bundleContext) throws Exception {
        scheduler.shutdownNow();
    }

    private final class GcSampling implements Runnable {
        private long lastGcTime = 0;
        private long lastCpuTime = 0;

        @Override
        public void run() {
            List<GarbageCollectorMXBean> gcBeans = ManagementFactory.getGarbageCollectorMXBeans();
            long totalGcTime = gcBeans.stream().collect(Collectors.summingLong(GarbageCollectorMXBean::getCollectionTime));
            long gcTime = totalGcTime - lastGcTime;
            lastGcTime = totalGcTime;

            OperatingSystemMXBean osBean = ManagementFactory.getPlatformMXBean(
                OperatingSystemMXBean.class);

            // get cpu time for process.
            long totalCpuTime = osBean.getProcessCpuTime();
            long cpuTime;
            if (totalCpuTime < 0) {
                cpuTime = -1;
            } else {
                cpuTime = totalCpuTime - lastCpuTime;
                lastCpuTime = totalCpuTime;
            }
            cpuTime = TimeUnit.NANOSECONDS.toMillis(cpuTime);

            // get swap load
            double swapSize = (double) osBean.getTotalSwapSpaceSize();
            int swapLoad = (int) (swapSize > 0 ? (1 - osBean.getFreeSwapSpaceSize() / swapSize) * 100 : 0);

            JvmReport report = new JvmReport(gcTime, cpuTime, swapLoad);
            JavaLanguageServerPlugin.getInstance()
                .getClientConnection().executeClientCommand("_jdtls.daemon.jvmReport", report);
        }
    }
}