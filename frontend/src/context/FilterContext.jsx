import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('');
  const [searchFields, setSearchFields] = useState([]); // Array of { value, label }
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showDateSlicer, setShowDateSlicer] = useState(false);

  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('asc');

  // Helper to reset filters when changing screens
  const resetFilters = (fields = [], defaultField = '', showDate = false) => {
    setSearchQuery('');
    setSearchFields(fields);
    setSearchField(defaultField || (fields[0]?.value || ''));
    setFromDate('');
    setToDate('');
    setShowDateSlicer(showDate);
    setSortField('id');
    setSortOrder('asc');
  };

  return (
    <FilterContext.Provider value={{
      searchQuery, setSearchQuery,
      searchField, setSearchField,
      searchFields, setSearchFields,
      fromDate, setFromDate,
      toDate, setToDate,
      showDateSlicer, setShowDateSlicer,
      sortField, setSortField,
      sortOrder, setSortOrder,
      resetFilters
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
