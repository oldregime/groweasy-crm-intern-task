'use client';

import React, { useRef, useState, useEffect } from 'react';

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
  width?: string;
}

interface VirtualizedTableProps {
  columns: Column[];
  data: any[];
  rowHeight?: number;
  height?: string;
}

export default function VirtualizedTable({
  columns,
  data,
  rowHeight = 48,
  height = '400px',
}: VirtualizedTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Update container height measurements
  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
      
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]) {
          setContainerHeight(entries[0].contentRect.height);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = data.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5); // 5 rows buffer
  const endIndex = Math.min(
    data.length,
    Math.floor((scrollTop + containerHeight) / rowHeight) + 5
  );

  const visibleData = data.slice(startIndex, endIndex);
  const offsetTop = startIndex * rowHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="custom-table-container relative w-full"
      style={{ height, overflow: 'auto' }}
    >
      <div style={{ height: `${Math.max(totalHeight, 1)}px`, width: '100%', position: 'relative' }}>
        {/* Sticky Headers (simulated via absolute positioning above virtual rows) */}
        <div 
          className="sticky top-0 left-0 right-0 z-30 flex bg-[#0d1423] border-b border-[rgba(255,255,255,0.06)]"
          style={{ height: `${rowHeight}px` }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className="flex items-center px-4 font-semibold text-slate-400 text-xs uppercase tracking-wider"
              style={{ width: col.width || '150px', flexShrink: 0 }}
            >
              {col.header}
            </div>
          ))}
        </div>

        {/* Virtualized Rows Container */}
        <div
          style={{
            transform: `translateY(${offsetTop + rowHeight}px)`, // Offset by header height
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
          }}
        >
          {visibleData.length === 0 ? (
            <div className="flex items-center justify-center text-slate-500 text-sm py-12">
              No records available.
            </div>
          ) : (
            visibleData.map((row, index) => {
              const actualIndex = startIndex + index;
              const isEven = actualIndex % 2 === 0;
              return (
                <div
                  key={row.id || actualIndex}
                  className={`flex border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors`}
                  style={{ height: `${rowHeight}px` }}
                >
                  {columns.map((col) => {
                    const val = row[col.key];
                    return (
                      <div
                        key={col.key}
                        className="flex items-center px-4 text-sm truncate text-slate-200"
                        style={{ width: col.width || '150px', flexShrink: 0 }}
                      >
                        {col.render ? col.render(val, row) : val !== undefined && val !== null ? String(val) : '—'}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
