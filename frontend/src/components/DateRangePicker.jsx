import React, { useState, useRef, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DateRangePicker({ fromDate, setFromDate, toDate, setToDate, placeholder = "Select Date Range" }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 'date' | 'month' | 'year'
  const [view, setView] = useState('date');
  
  // The current focus year/month for calendar rendering
  const [currentDate, setCurrentDate] = useState(() => dayjs());
  const [isSelecting, setIsSelecting] = useState(false);
  
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Display text for the active range
  const displayText = useMemo(() => {
    if (fromDate && toDate) {
      if (fromDate === toDate) {
        return dayjs(fromDate).format('DD/MM/YYYY');
      }
      return `${dayjs(fromDate).format('DD/MM/YYYY')} - ${dayjs(toDate).format('DD/MM/YYYY')}`;
    }
    if (fromDate) {
      return `${dayjs(fromDate).format('DD/MM/YYYY')} - ...`;
    }
    return placeholder;
  }, [fromDate, toDate, placeholder]);

  // Handle Date clicks
  const handleDateClick = (date) => {
    const clickedDateStr = date.format('YYYY-MM-DD');
    if (!isSelecting) {
      setFromDate(clickedDateStr);
      setToDate(clickedDateStr);
      setIsSelecting(true);
    } else {
      if (dayjs(clickedDateStr).isBefore(dayjs(fromDate))) {
        setToDate(fromDate);
        setFromDate(clickedDateStr);
      } else {
        setToDate(clickedDateStr);
      }
      setIsSelecting(false);
      setIsOpen(false);
    }
  };

  // Navigations based on views
  const handlePrev = () => {
    if (view === 'date') {
      setCurrentDate(prev => prev.subtract(1, 'month'));
    } else if (view === 'month') {
      setCurrentDate(prev => prev.subtract(1, 'year'));
    } else if (view === 'year') {
      setCurrentDate(prev => prev.subtract(12, 'year'));
    }
  };

  const handleNext = () => {
    if (view === 'date') {
      setCurrentDate(prev => prev.add(1, 'month'));
    } else if (view === 'month') {
      setCurrentDate(prev => prev.add(1, 'year'));
    } else if (view === 'year') {
      setCurrentDate(prev => prev.add(12, 'year'));
    }
  };

  // Clear selections
  const clearSelection = (e) => {
    e.stopPropagation();
    setFromDate('');
    setToDate('');
    setIsSelecting(false);
  };

  // Calendar rendering grids
  const daysInMonth = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const days = [];
    
    // Fill previous month days for offset
    const startDayOfWeek = startOfMonth.day(); // 0 is Sunday
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: startOfMonth.subtract(i + 1, 'day'),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    const totalDays = currentDate.daysInMonth();
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: currentDate.date(i),
        isCurrentMonth: true
      });
    }
    
    // Remaining days to fill grid (6 rows of 7 = 42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: endOfMonth.add(i, 'day'),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentDate]);

  const yearRange = useMemo(() => {
    const startYear = currentDate.year() - (currentDate.year() % 12);
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(startYear + i);
    }
    return years;
  }, [currentDate]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input button trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-slate-200 px-3 py-2 rounded-lg bg-white cursor-pointer select-none hover:border-blue-400 transition-colors shadow-sm"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
          <Calendar size={14} className="text-slate-400 flex-shrink-0" />
          <span className="truncate">{displayText}</span>
        </div>
        {(fromDate || toDate) && (
          <button 
            type="button" 
            onClick={clearSelection}
            className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors ml-1"
            title="Clear Selection"
          >
            <X size={12} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Popover Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[999] top-full mt-1 left-0 right-0 md:w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button 
                type="button" 
                onClick={handlePrev}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              
              {view === 'date' && (
                <button 
                  type="button" 
                  onClick={() => setView('month')}
                  className="text-xs font-bold text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors"
                >
                  {currentDate.format('MMMM YYYY')}
                </button>
              )}
              {view === 'month' && (
                <button 
                  type="button" 
                  onClick={() => setView('year')}
                  className="text-xs font-bold text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-lg tracking-wider transition-colors"
                >
                  {currentDate.format('YYYY')}
                </button>
              )}
              {view === 'year' && (
                <span className="text-xs font-bold text-slate-800 tracking-wider">
                  {yearRange[0]} - {yearRange[yearRange.length - 1]}
                </span>
              )}

              <button 
                type="button" 
                onClick={handleNext}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Date View Grid */}
            {view === 'date' && (
              <div>
                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase mb-1">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>
                <div className="grid grid-cols-7 gap-y-0.5 text-xs">
                  {daysInMonth.map((cell, idx) => {
                    const dateStr = cell.date.format('YYYY-MM-DD');
                    const isToday = cell.date.isSame(dayjs(), 'day');
                    const isSelectedStart = fromDate === dateStr;
                    const isSelectedEnd = toDate === dateStr;
                    const isSelected = isSelectedStart || isSelectedEnd;
                    const isInRange = fromDate && toDate && 
                      cell.date.isAfter(dayjs(fromDate), 'day') && 
                      cell.date.isBefore(dayjs(toDate), 'day');

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDateClick(cell.date)}
                        className={`
                          py-1 text-center font-semibold cursor-pointer transition-colors relative flex items-center justify-center h-7 w-7 mx-auto rounded-full
                          ${!cell.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                          ${isToday && !isSelected ? 'border border-blue-500 text-blue-600' : ''}
                          ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : ''}
                          ${isInRange ? 'bg-blue-50 text-blue-600 rounded-none w-full' : ''}
                          ${cell.isCurrentMonth && !isSelected && !isInRange ? 'hover:bg-slate-100' : ''}
                        `}
                      >
                        {cell.date.date()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Month View Grid */}
            {view === 'month' && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {months.map((m, idx) => {
                  const isCurrent = currentDate.month() === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCurrentDate(prev => prev.month(idx));
                        setView('date');
                      }}
                      className={`
                        py-2 text-xs font-bold rounded-lg transition-colors uppercase
                        ${isCurrent ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}
                      `}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Year View Grid */}
            {view === 'year' && (
              <div className="grid grid-cols-3 gap-2 py-1">
                {yearRange.map((y) => {
                  const isCurrent = currentDate.year() === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setCurrentDate(prev => prev.year(y));
                        setView('month');
                      }}
                      className={`
                        py-2 text-xs font-bold rounded-lg transition-colors
                        ${isCurrent ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}
                      `}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            )}
            {(fromDate || toDate) && (
              <div className="border-t border-slate-100 pt-2 mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    clearSelection(e);
                    setIsOpen(false);
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider w-full text-center"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
