"use client";
import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  AnimatePresence,
  useAnimate,
} from "framer-motion";


export function TableDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [stickyPoint, setStickyPoint] = useState(0);
  const [scrollRange, setScrollRange] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const scaleValue = useMotionValue(1);
  const [cursorScope, animateCursor] = useAnimate();
  const [hasTriggeredClick, setHasTriggeredClick] = useState(false);


  const STRETCH_MULTIPLIER = 3; // increase to slow animations (more scroll), decrease to speed up
  const STICKY_OFFSET = 192; // tailwind top-48
  const agentPromptText = "how many number of employees in the company";


  const [badgePosition, setBadgePosition] = useState<'ai' | number>('ai');


  // Animation Duration Controls (scroll percentages)
  const ANIMATION_DURATIONS = {
  SCALE_RAMPUP: { start: 0, mid: 10, end: 20 },
  NEW_COLUMN_BUTTON: { start: 10, end: 20 },
  CURSOR_MOVEMENT: { start: 15, end: 22 },
  BUTTON_CLICK: { start: 0, mid: 0, end: 0 }, //not effective now
  PROMPT_DIALOG: { start: 23, end: 28 },
  PROMPT_TEXT: { start: 24, end: 40 },
  NEW_COLUMN_CREATION: { start: 40, end: 50 },
  BADGE_PROGRESS: { start: 54, end: 68 },
  TABLE_TRANSLATE: { start: 70, end: 80 },
  PATH_DRAWING: { start: 80, end: 90 },
  ICONS_OPACITY: { start: 90, end: 94 },
} as const;



  const pct = (value: number) => value / 100;


  useLayoutEffect(() => {
    const measure = () => {
      if (!ref.current || !containerRef.current) return;

      const stickyRect = ref.current.getBoundingClientRect();
      const desiredExtra = window.innerHeight * 3.5 * STRETCH_MULTIPLIER; // scrollable runway
      const nextContainerHeight = stickyRect.height + desiredExtra;
      setContainerHeight(nextContainerHeight);

      const containerRect = containerRef.current.getBoundingClientRect();
      const stickyStart = window.scrollY + containerRect.top - STICKY_OFFSET;
      const stickyEnd =
        window.scrollY + containerRect.top + nextContainerHeight - stickyRect.height - STICKY_OFFSET;

      setStickyPoint(stickyStart);
      setScrollRange(Math.max(stickyEnd - stickyStart, 1));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);


  const { scrollY } = useScroll();
  const scrollProgress = useTransform(
    scrollY,
    [stickyPoint, stickyPoint + scrollRange],
    [0, 1],
    { clamp: true }
  );


  const badgeProgress = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.BADGE_PROGRESS.start), pct(ANIMATION_DURATIONS.BADGE_PROGRESS.end)],
    [0, 3],
    { clamp: true }
  );


  // console.log scroll y postion and its percentages
  useEffect(() => {
    const unsubscribe = scrollProgress.on("change", (value) => {
      console.log(`Scroll progress: ${(value * 100).toFixed(2)}%`);
    });
    return unsubscribe;
  }, [scrollProgress]);


  useEffect(() => {
    const unsubscribe = badgeProgress.on("change", (value) => {
      const index = Math.round(value);
      const positions: ('ai' | number)[] = [0, 1, 2, 3];
      setBadgePosition(positions[index] || 0);
    });
    return unsubscribe;
  }, [badgeProgress]);


  const scale = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.SCALE_RAMPUP.start), pct(ANIMATION_DURATIONS.SCALE_RAMPUP.mid), pct(ANIMATION_DURATIONS.SCALE_RAMPUP.end)],
    [1, 1.25, 1.25],
    { clamp: true }
  );


  const totalScale = useTransform([scale, scaleValue], (values: number[]) => values[0]! * values[1]!);


  const cursorProgress = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.CURSOR_MOVEMENT.start), pct(ANIMATION_DURATIONS.CURSOR_MOVEMENT.end)],
    [0, 1],
    { clamp: true }
  );


  const buttonClickScale = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.BUTTON_CLICK.start), pct(ANIMATION_DURATIONS.BUTTON_CLICK.mid), pct(ANIMATION_DURATIONS.BUTTON_CLICK.end)],
    [1, 0.85, 1],
    { clamp: true }
  );


  const [showCursor, setShowCursor] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });


  useEffect(() => {
    const unsubscribe = cursorProgress.on("change", (latest) => {
      setShowCursor(latest > 0);
      
      // Trigger 400ms click animation when cursor reaches button
      if (latest > 0.9 && !hasTriggeredClick && cursorScope.current) {
        setHasTriggeredClick(true);
        
        // 400ms click animation sequence
        const clickAnimation = async () => {
          await animateCursor(
            cursorScope.current,
            { scale: 0.7 },
            { duration: 0.2, ease: "easeOut" }
          );
          await animateCursor(
            cursorScope.current,
            { scale: 1 },
            { duration: 0.2, ease: "easeOut" }
          );
        };
        clickAnimation();
      }
      
      // Reset for replay
      if (latest < 0.5) {
        setHasTriggeredClick(false);
      }
      
      if (ref.current && tableRef.current) {
        const motionRect = ref.current.getBoundingClientRect();
        const tableRect = tableRef.current.getBoundingClientRect();
        const tableLeft = tableRect.left - motionRect.left;
        const startX = motionRect.width + 100;
        const endX = tableLeft + 968;
        const startY = 200;
        const endY = 120;


        const controlX = startX + (endX - startX) / 2;
        const controlY = startY + 150;


        const t = latest;
        const x =
          (1 - t) * (1 - t) * startX +
          2 * (1 - t) * t * controlX +
          t * t * endX;
        const y =
          (1 - t) * (1 - t) * startY +
          2 * (1 - t) * t * controlY +
          t * t * endY;


        setCursorPos({ x, y });
      }
    });
    return unsubscribe;
  }, [hasTriggeredClick, cursorProgress, animateCursor, cursorScope]);


  const showNewColumnBtn = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.NEW_COLUMN_BUTTON.start), pct(ANIMATION_DURATIONS.NEW_COLUMN_BUTTON.end)],
    [0, 1],
    { clamp: true }
  );


  const [newColumnVisible, setNewColumnVisible] = useState(false);


  useEffect(() => {
    const unsubscribe = showNewColumnBtn.on("change", (latest) => {
      setNewColumnVisible(latest > 0.5);
    });
    return unsubscribe;
  }, [showNewColumnBtn]);


  const promptDialogProgress = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.PROMPT_DIALOG.start), pct(ANIMATION_DURATIONS.PROMPT_DIALOG.end)],
    [0, 1],
    { clamp: true }
  );


  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [dialogPos, setDialogPos] = useState({ x: 512, y: 120 });


  useEffect(() => {
    const unsubscribe = promptDialogProgress.on("change", (latest) => {
      setShowPromptDialog(latest > 0.5);
      if (latest > 0.5 && ref.current && tableRef.current) {
        const motionRect = ref.current.getBoundingClientRect();
        const tableRect = tableRef.current.getBoundingClientRect();
        const tableLeft = tableRect.left - motionRect.left;
        const endX = tableLeft + 968;
        setDialogPos({ x: endX, y: 120 });
      }
    });
    return unsubscribe;
  }, [promptDialogProgress]);


  const promptTextProgress = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.PROMPT_TEXT.start), pct(ANIMATION_DURATIONS.PROMPT_TEXT.end)],
    [0, agentPromptText.length],
    { clamp: true }
  );


  const [displayedPromptText, setDisplayedPromptText] = useState("");


  useEffect(() => {
    const unsubscribe = promptTextProgress.on("change", (latest) => {
      const charCount = Math.floor(latest);
      setDisplayedPromptText(agentPromptText.slice(0, charCount));
    });
    return unsubscribe;
  }, [promptTextProgress]);


  const newColumnCreation = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.NEW_COLUMN_CREATION.start), pct(ANIMATION_DURATIONS.NEW_COLUMN_CREATION.end)],
    [0, 1],
    { clamp: true }
  );


  const [showEmployeesColumn, setShowEmployeesColumn] = useState(false);
  const [hidePromptDialog, setHidePromptDialog] = useState(false);


  useEffect(() => {
    const unsubscribe = newColumnCreation.on("change", (latest) => {
      setHidePromptDialog(latest > 0.2);
      setShowEmployeesColumn(latest > 0.4);
    });
    return unsubscribe;
  }, [newColumnCreation]);


  const tableTranslateX = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.TABLE_TRANSLATE.start), pct(ANIMATION_DURATIONS.TABLE_TRANSLATE.end)],
    [0, -700],
    { clamp: true }
  );


  const pathLength = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.PATH_DRAWING.start), pct(ANIMATION_DURATIONS.PATH_DRAWING.end)],
    [0, 1],
    { clamp: true }
  );


  const iconsOpacity = useTransform(
    scrollProgress,
    [pct(ANIMATION_DURATIONS.ICONS_OPACITY.start), pct(ANIMATION_DURATIONS.ICONS_OPACITY.end)],
    [0, 1],
    { clamp: true }
  );


   return (
    <div
      ref={containerRef}
      style={{ minHeight: containerHeight ? `${containerHeight}px` : "300vh" }}
    >
      <motion.div
        ref={ref}
        style={{ scale: totalScale, x: tableTranslateX }}
        className="w-full max-w-5xl sticky top-48 z-20 group cursor-default pb-12"
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        {/* Animated Cursor */}
        <AnimatePresence>
          {showCursor && (
            <motion.div
              ref={cursorScope}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: "absolute",
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                zIndex: 50,
                pointerEvents: "none",
              }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 20
              }}
            >
              <svg
                width="23"
                height="26"
                viewBox="0 0 23 26"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.00496184 3.18575C-0.143157 0.718057 2.58952 -0.85965 4.65254 0.502472L21.2853 11.4843C23.7578 13.1168 22.6189 16.9642 19.6562 16.9878L12.4871 17.0449C11.4143 17.0534 10.4277 17.6342 9.89963 18.568L6.78673 24.0723C5.31534 26.6741 1.35987 25.7589 1.18078 22.7753L0.00496184 3.18575Z"
                  fill="#050404"
                />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Agent Prompt Dialog */}
        <AnimatePresence>
          {showPromptDialog && !hidePromptDialog && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              style={{
                position: "absolute",
                left: `${dialogPos.x - 150}px`,
                top: `${dialogPos.y}px`,
                zIndex: 40,
              }}
              className="bg-white border-2 border-accent-blue/30 rounded-xl shadow-2xl shadow-accent-blue/20 p-4 w-[300px]"
            >
              {/* Arrow pointer */}
              <div className="absolute -top-2 left-1/2 -translate-x-2 w-4 h-4 bg-white border-l-2 border-t-2 border-accent-blue/30 rotate-45" />


              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="text-[10px] font-bold text-accent-blue tracking-wide uppercase">
                    Agent Prompt
                  </div>
                </div>


                <div className="bg-surface-light border border-accent-blue/30 rounded-lg p-3 relative">
                  <div className="text-sm font-medium text-text-main min-h-[48px]">
                    {displayedPromptText}
                    {displayedPromptText.length < agentPromptText.length &&
                      displayedPromptText.length > 0 && (
                        <span className="w-0.5 h-4 inline-block align-middle bg-accent-blue animate-pulse ml-0.5" />
                      )}
                  </div>
                  <button className="absolute bottom-2 right-2 w-6 h-6 rounded-md bg-accent-blue flex items-center justify-center shadow-lg">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </button>
                </div>


                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-text-muted tracking-wide uppercase mb-1">
                      Name
                    </div>
                    <div className="bg-surface-light border border-border-light rounded-md px-3 py-2 text-sm font-semibold text-text-main">
                      Employees
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-text-muted tracking-wide uppercase mb-1">
                      Column Type
                    </div>
                    <div className="bg-white border border-border-light rounded-md px-3 py-2 text-sm font-medium text-text-main flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-chevron-down-icon lucide-square-chevron-down text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m16 10-4 4-4-4"/></svg>
                        <span>Select</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        <div className="rounded-xl border border-border-light bg-white shadow-2xl shadow-slate-200/50 overflow-hidden transition-all duration-500">
          {/* Window controls */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light bg-surface-light">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-black/5" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/5" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-black/5" />
            </div>
            <div className="mx-auto text-xs font-mono text-text-muted">
              enrich_leads_Q3.glaze
            </div>
          </div>


          {/* Toolbar */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border-light bg-white text-xs text-text-muted">
            <div className="flex items-center gap-1 hover:text-text-main cursor-pointer">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </div>
            <div className="h-4 w-px bg-border-light" />
            <div className="flex items-center gap-1 text-text-main">
              <svg
                className="w-4 h-4 text-accent-purple"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Agents: Active
            </div>
            <div className="flex-1" />
            <div className="text-accent-blue flex items-center gap-1 font-medium">
              <svg
                className="w-3.5 h-3.5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Streaming...
            </div>
          </div>


          {/* Table */}
          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className="w-full border-collapse text-sm text-left font-mono"
            >
              <thead>
                <tr className="text-text-muted border-b border-border-light bg-surface-light/50">
                  <th className="w-12 p-2 text-center border-r border-border-light font-normal">
                    #
                  </th>
                  <th className="p-3 border-r border-border-light font-normal min-w-[200px]">
                    Company
                  </th>
                  <th className="p-3 border-r border-border-light font-normal min-w-[200px]">
                    Website
                  </th>
                  <th className="p-3 border-r border-border-light font-normal min-w-[150px]">
                    Status
                  </th>
                  <th className="p-3 font-normal text-text-main bg-accent-blue/5 w-full min-w-[300px]">
                    AI Insight (Streaming)
                  </th>


                  {/* Dynamic "New column" or "Employees" column */}
                  <AnimatePresence mode="wait">
                    {!showEmployeesColumn && newColumnVisible ? (
                      <motion.th
                        key="new-column"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "140px" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="p-3 border-r border-border-light font-normal relative"
                      >
                        <motion.span 
                          style={{ scale: buttonClickScale }}
                          className="inline-block text-accent-blue font-medium cursor-pointer hover:underline"
                        >
                          + New column
                        </motion.span>
                      </motion.th>
                    ) : showEmployeesColumn ? (
                      <motion.th
                        key="employees-column"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 border-r border-border-light font-normal min-w-[140px] relative"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-text-main font-medium">
                            Employees
                          </span>
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                        </div>
                      </motion.th>
                    ) : null}
                  </AnimatePresence>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-text-main">
                {/* Row 1 */}
                <tr className="hover:bg-surface-hover">
                  <td className="text-center text-text-muted border-r border-border-light bg-surface-light/30">
                    1
                  </td>
                  <td className="p-3 border-r border-border-light font-medium">
                    Acme Corp
                  </td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">
                    acme.co
                  </td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      Enriched
                    </span>
                  </td>
                  <td className="p-3 text-text-muted">
                    Focuses on high-scale logistics solutions for enterprise
                    e-commerce...
                  </td>
                  {showEmployeesColumn && (
                    <motion.td
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 border-r border-border-light text-text-muted relative transition-all duration-300 ${
                        badgePosition === 0 ? 'border-l-2 border-l-accent-blue bg-accent-blue/5' : ''
                      }`}
                    >
                      {
                      typeof badgePosition === 'number' && badgePosition >=0 ? '5,000+' : <div className="bg-accent-blue/10 rounded px-2 py-1 text-accent-blue font-medium animate-pulse h-6">Loading...</div>                     
                      }
                      <AnimatePresence>
                        {badgePosition === 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute -top-3 right-2 bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
                          >
                            AGENT RUNNING
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.td>
                  )}
                </tr>


                {/* Row 2 */}
                <tr className="hover:bg-surface-hover">
                  <td className="text-center text-text-muted border-r border-border-light bg-surface-light/30">
                    2
                  </td>
                  <td className="p-3 border-r border-border-light font-medium">
                    Linear
                  </td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">
                    linear.app
                  </td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      Enriched
                    </span>
                  </td>
                  <td className="p-3 text-text-muted">
                    Issue tracking tool built for high-performance product
                    teams.
                  </td>
                  {showEmployeesColumn && (
                    <motion.td
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 border-r border-border-light text-text-muted relative transition-all duration-300 ${
                        badgePosition === 1 ? 'border-l-2 border-l-accent-blue bg-accent-blue/5' : ''
                      }`}
                    >
                      {
                      typeof badgePosition === 'number' && badgePosition >=1 ? '25-50' : <div className="bg-accent-blue/10 rounded px-2 py-1 h-6 text-accent-blue font-medium animate-pulse">Loading...</div>                    
                      }
                      <AnimatePresence>
                        {badgePosition === 1 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute -top-3 right-2 bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
                          >
                            AGENT RUNNING
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.td>
                  )}
                </tr>


                {/* Active row - Glaze */}
                <tr className="bg-accent-blue/5">
                  <td className="text-center text-text-muted border-r border-border-light bg-accent-blue/10 border-l-2 border-l-accent-blue">
                    3
                  </td>
                  <td className="p-3 border-r border-border-light font-bold text-text-main">
                    Glaze
                  </td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">
                    glaze.so
                  </td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-white text-accent-blue border border-accent-blue/20 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                      Processing
                    </span>
                  </td>
                  <td className={`p-3 relative bg-white transition-all duration-300 ${
                    badgePosition === 'ai' 
                      ? 'border-2 border-accent-blue/50 shadow-[0_0_25px_rgba(14,165,233,0.15)]' 
                      : 'border-2 border-accent-blue/10'
                  }`}>
                    <span className="text-text-main">
                      An agentic spreadsheet that transforms static rows into
                      dynamic workflows
                    </span>
                    <AnimatePresence>
                      {badgePosition === 'ai' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute -top-3 right-2 bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
                        >
                          AGENT RUNNING
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                  {showEmployeesColumn && (
                    <motion.td
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-3 border-r border-border-light relative transition-all duration-300 ${
                        badgePosition === 2 ? 'border-l-2 border-l-accent-blue bg-accent-blue/5' : ''
                      }`}
                    >
                      {
                      typeof badgePosition === 'number' && badgePosition >=2 ? '2-10' : <div className="bg-accent-blue/10 rounded px-2 py-1 h-6 text-accent-blue font-medium animate-pulse">Loading...</div>
                      }
                      <AnimatePresence>
                        {badgePosition === 2 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute -top-3 right-2 bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
                          >
                            AGENT RUNNING
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.td>
                  )}
                </tr>


                {/* Row 4 */}
                <tr className="hover:bg-surface-hover opacity-60">
                  <td className="text-center text-text-muted border-r border-border-light bg-surface-light/30">
                    4
                  </td>
                  <td className="p-3 border-r border-border-light font-medium">
                    Vercel
                  </td>
                  <td className="p-3 border-r border-border-light text-accent-blue hover:underline underline-offset-4 cursor-pointer">
                    vercel.com
                  </td>
                  <td className="p-3 border-r border-border-light">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                      Queued
                    </span>
                  </td>
                  <td className="p-3" />
                  {showEmployeesColumn && (
                    <motion.td
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 border-r border-border-light text-text-muted relative transition-all duration-300 ${
                        badgePosition === 3 ? 'border-l-2 border-l-accent-blue bg-accent-blue/5' : ''
                      }`}
                    >
                      -
                      <AnimatePresence>
                        {badgePosition === 3 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute -top-3 right-2 bg-gradient-to-r from-accent-blue to-accent-purple text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
                          >
                            AGENT RUNNING
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>


        {/* Animated SVG with paths and icons - appears on right side after table moves */}
        <motion.div
          style={{
            position: "absolute",
            left: "100%",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
          className="w-full"
        >
          <svg
            width="553"
            height="504"
            viewBox="0 0 553 504"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[553px] h-[504px]"
          >
            {/* Animated paths with progressive drawing */}
            <motion.path
              d="M0.00390625 246.407C231.504 248.267 225.504 96.5 481.504 140.5"
              stroke="#2BADEE"
              strokeLinecap="round"
              strokeWidth="2"
              style={{ 
                pathLength,
                opacity: 1
              }}
              initial={{ pathLength: 0 }}
            />
            <motion.path
              d="M0.00390625 246.407C231.504 248.267 188.004 10.0002 481.504 31.5"
              stroke="#2BADEE"
              strokeLinecap="round"
              strokeWidth="2"
              style={{ 
                pathLength,
                opacity: 1
              }}
              initial={{ pathLength: 0 }}
            />
            <motion.path
              d="M0.00390625 246.407C231.504 248.267 239.504 393 479.504 351.5"
              stroke="#2BADEE"
              strokeLinecap="round"
              strokeWidth="2"
              style={{ 
                pathLength,
                opacity: 1
              }}
              initial={{ pathLength: 0 }}
            />
            <motion.path
              d="M0.00390625 246.407C231.504 248.267 200.504 487 479.504 460.5"
              stroke="#2BADEE"
              strokeLinecap="round"
              strokeWidth="2"
              style={{ 
                pathLength,
                opacity: 1
              }}
              initial={{ pathLength: 0 }}
            />
            <motion.path
              d="M0.00390625 246.407C231.504 248.267 231.004 248.267 477.504 246.407"
              stroke="#2BADEE"
              strokeLinecap="round"
              strokeWidth="2"
              style={{ 
                pathLength,
                opacity: 1
              }}
              initial={{ pathLength: 0 }}
            />


            {/* Icons - appear after paths are drawn */}
            <motion.image
              x="482"
              y="106"
              width="56"
              height="80"
              href="/img/icons/http-api.png"
              style={{ opacity: iconsOpacity }}
            />
            <motion.image
              x="469"
              y="212"
              width="84"
              height="80"
              href="/img/icons/slack.png"
              style={{ opacity: iconsOpacity }}
            />
            <motion.image
              x="464"
              y="424"
              width="83"
              height="80"
              href="/img/icons/zapier.png"
              style={{ opacity: iconsOpacity }}
            />
            <motion.image
              x="474"
              y="0"
              width="76"
              height="80"
              href="/img/icons/hubspot.png"
              style={{ opacity: iconsOpacity }}
            />
            <motion.image
              x="474"
              y="318"
              width="73"
              height="80"
              href="/img/icons/webhook.png"
              style={{ opacity: iconsOpacity }}
            />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}


