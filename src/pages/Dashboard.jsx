import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const getLocalToday = () => {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
}

export default function Dashboard() {
  const [today] = useState(getLocalToday);
  
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');
  const [category, setCategory] = useState('Others');
  const [date, setDate] = useState(today);
  const [editingId, setEditingId] = useState(null);
  const [showScheduled, setShowScheduled] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [collapsedMonths, setCollapsedMonths] = useState({});
  const [hasPending, setHasPending] = useState(false);
  
  const navigate = useNavigate();

  // Fetches all user transactions from the API
  const fetchTransactions = (pageNum = 1, shouldAppend = false, currentStatus = showScheduled ? 'pending' : 'paid') => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) return
    
    api.get(`/api/transactions?page=${pageNum}&limit=10&status=${currentStatus}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      if (shouldAppend) {
        // Appends new page items to the existing list
        setTransactions(prev => [...prev, ...response.data])
      } else {
        // Overwrites the list (used on initial load or resets)
        setTransactions(response.data)
      }
    })
    .catch(error => console.error("Error fetching transactions:", error))
  }

  // Checks if there are any pending transactions in the database
  const checkPending = () => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) return
    api.get('/api/transactions?status=pending&limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setHasPending(res.data.length > 0))
    .catch(err => console.error(err))
  }

  useEffect(() => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) {
      setTimeout(() => navigate('/login'), 0)
    } else {
      fetchTransactions(1, false)
      checkPending()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Action for Filter Tabs
  const handleFilterClick = (filter) => {
    setActiveFilter(filter)
    if (showScheduled) {
      setShowScheduled(false)
      setPage(1)
      fetchTransactions(1, false, 'paid')
    }
  }

  // Action for Scheduled Toggle Button
  const handleToggleScheduled = () => {
    const nextState = !showScheduled
    setShowScheduled(nextState)
    setPage(1)
    fetchTransactions(1, false, nextState ? 'pending' : 'paid')
  }

  // Handles loading the next page of transactions
  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTransactions(nextPage, true, showScheduled ? 'pending' : 'paid')
  }

  // Clears token and redirects to login
  const handleLogout = () => {
    localStorage.removeItem('@FinanceHub:token')
    navigate('/login')
  }

  // Saves a new transaction or updates an existing one
  const handleSaveTransaction = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('@FinanceHub:token')

    const transactionStatus = date > today ? 'pending' : 'paid'
    const safeAmount = Math.abs(Number(amount))

    try {
      if (editingId) {
        await api.put(`/api/transactions/${editingId}`, {
          description,
          amount: safeAmount, 
          type,
          date,
          status: transactionStatus,
          category
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await api.post('/api/transactions', {
          description,
          amount: safeAmount, 
          type,
          date,
          status: transactionStatus,
          category
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      setDescription('')
      setAmount('')
      setType('income')
      setDate(today)
      setCategory('Others')
      setEditingId(null)
      setPage(1)
      fetchTransactions(1, false, showScheduled ? 'pending' : 'paid')
      checkPending()
    } catch (error) {
      console.error("Error saving transaction:", error)
      alert("Error saving transaction.")
    }
  }

  // Changes a pending transaction status to paid
  const handleMarkAsPaid = async (transaction) => {
    const token = localStorage.getItem('@FinanceHub:token')
    try {
      await api.put(`/api/transactions/${transaction.id}`, {
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        date: today,
        status: 'paid',
        category: transaction.category || 'Others'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPage(1)
      fetchTransactions(1, false, showScheduled ? 'pending' : 'paid')
      checkPending()
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  // Populates the form with transaction data for editing
  const handleEditClick = (transaction) => {
    setDescription(transaction.description)
    setAmount(transaction.amount)
    setType(transaction.type)
    setDate(transaction.date ? transaction.date.split('T')[0] : today)
    setCategory(transaction.category || 'Others')
    setEditingId(transaction.id)
  }

  // Resets the form and clears editing state
  const handleCancelEdit = () => {
    setDescription('')
    setAmount('')
    setType('income')
    setDate(today)
    setCategory('Others')
    setEditingId(null)
  }

  // Removes a transaction from the database
  const handleDeleteTransaction = async (id) => {
    const token = localStorage.getItem('@FinanceHub:token')
    try {
      await api.delete(`/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPage(1)
      fetchTransactions(1, false, showScheduled ? 'pending' : 'paid')
      checkPending()
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  const income = transactions
    .filter(t => t.type === 'income' && t.status !== 'pending')
    .reduce((acc, t) => acc + Number(t.amount), 0)
    
  const expense = transactions
    .filter(t => t.type === 'expense' && t.status !== 'pending')
    .reduce((acc, t) => acc + Number(t.amount), 0)
    
  const total = income - expense

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense' && t.status !== 'pending')
    .reduce((acc, t) => {
      const cat = t.category || 'Others'
      acc[cat] = (acc[cat] || 0) + Number(t.amount)
      return acc
    }, {})

    const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }))

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899']

  const displayedTransactions = transactions.filter(t => {
    if (activeFilter === 'all') return true
    return t.type === activeFilter
  })

  // Formats a date string to DD/MM/YYYY format
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('T')[0].split('-')
    return `${day}/${month}/${year}`
  }

  // Groups transactions by Month and Year
  const groupedTransactions = displayedTransactions.reduce((acc, t) => {
    const dateStr = t.date || t.createdAt || t.created_at;
    if (!dateStr) return acc;
    
    const [year, month] = dateStr.split('T')[0].split('-');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[parseInt(month, 10) - 1];
    const groupKey = `${monthName} ${year}`;
    
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(t);
    return acc;
  }, {});

  // Toggles the accordion state for a specific month
  const toggleMonth = (monthKey) => {
    setCollapsedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">FinanceHub</h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Income Card */}
          <div className={`p-4 rounded-lg shadow transition-colors ${activeFilter === 'income' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            <h3 className={activeFilter === 'income' ? 'text-blue-100' : 'text-gray-500'}>Income</h3>
            <p className={`text-2xl font-bold ${activeFilter === 'income' ? 'text-white' : 'text-green-600'}`}>
              R$ {income.toFixed(2)}
            </p>
          </div>
          {/* Expenses Card */}
          <div className={`p-4 rounded-lg shadow transition-colors ${activeFilter === 'expense' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            <h3 className={activeFilter === 'expense' ? 'text-blue-100' : 'text-gray-500'}>Expenses</h3>
            <p className={`text-2xl font-bold ${activeFilter === 'expense' ? 'text-white' : 'text-red-600'}`}>
              R$ {expense.toFixed(2)}
            </p>
          </div>
          {/* Total Balance Card */}
          <div className={`p-4 rounded-lg shadow transition-colors ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            <h3 className={activeFilter === 'all' ? 'text-blue-100' : 'text-gray-500'}>Total Balance</h3>
            <p className={`text-2xl font-bold ${activeFilter === 'all' ? 'text-white' : 'text-gray-800'}`}>
              R$ {total.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Middle Section: Form and Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 items-start">
          
          {/* Transaction Form */}
          <form onSubmit={handleSaveTransaction} className="p-6 bg-white rounded-lg shadow space-y-4">
            <h2 className="text-xl font-semibold">
              {editingId ? 'Edit Transaction' : 'New Transaction'}
            </h2>
            
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="Description" 
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="Amount" 
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 p-2 border rounded"
                />
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="flex-1 p-2 border rounded text-gray-600"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <select 
                  value={type}
                  onChange={e => {
                    setType(e.target.value);
                    setCategory('Others');
                  }}
                  className="flex-1 p-2 border rounded"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="flex-1 p-2 border rounded"
                >
                  {type === 'income' ? (
                    <>
                      <option value="Salary">Salary</option>
                      <option value="Investments">Investments</option>
                      <option value="Others">Others</option>
                    </>
                  ) : (
                    <>
                      <option value="Food">Food</option>
                      <option value="Transport">Transport</option>
                      <option value="Housing">Housing</option>
                      <option value="Health">Health</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Others">Others</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 flex-1">
                  {editingId ? 'Update' : 'Save'}
                </button>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 flex-1"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Expense Chart */}
          {chartData.length > 0 && (
            <div className="p-6 bg-white rounded-lg shadow flex flex-col justify-center h-full">
              <h2 className="mb-4 text-xl font-semibold text-center text-gray-700">Expenses by Category</h2>
              <div className="h-[235px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
        </div>

        {/* History Header Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between w-full mb-6 gap-4">
            
            {/* Title - Left */}
            <div className="flex-1 flex justify-start">
              <h2 className="text-xl font-semibold whitespace-nowrap">
                {showScheduled ? 'Scheduled' : 'History'}
              </h2>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex-1 flex justify-center">
              <div className="flex bg-gray-100 p-1 rounded-lg border text-sm font-medium">
                <button
                  type="button"
                  onClick={() => handleFilterClick('all')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${activeFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  All
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterClick('income')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${activeFilter === 'income' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  Incomes
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterClick('expense')}
                  className={`px-3 py-1.5 rounded-md transition-colors ${activeFilter === 'expense' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  Expenses
                </button>
              </div>
            </div>
            
            {/* Scheduled Button */}
            <div className="flex-1 flex justify-end">
              <button 
                onClick={handleToggleScheduled}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap border ${
                  showScheduled 
                    ? 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300' 
                    : hasPending
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
                      : 'bg-white text-gray-500 border-gray-300 hover:text-gray-700 shadow-sm'
                }`}>
                {showScheduled ? 'Show All' : '🕒 Scheduled'}
              </button>
            </div>
            
          </div>

          
          {displayedTransactions.length === 0 ? (
            <p className="text-gray-500">No transactions found.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedTransactions).map(([monthKey, monthTransactions]) => (
                <div key={monthKey} className="border rounded-lg bg-white overflow-hidden shadow-sm">
                  
                  {/* Accordion Header */}
                  <button 
                    onClick={() => toggleMonth(monthKey)}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b">
                    <h3 className="font-bold text-gray-700 capitalize">{monthKey}</h3>
                    <span className="text-gray-500 font-medium text-sm">
                      {collapsedMonths[monthKey] ? '▼ Mostrar' : '▲ Ocultar'}
                    </span>
                  </button>
                  
                  {/* Accordion Body */}
                  {!collapsedMonths[monthKey] && (
                    <ul className="p-4 space-y-3">
                      {monthTransactions.map((t) => (
                        <li 
                          key={t.id} 
                          className={`flex items-center justify-between p-3 border rounded ${
                            t.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between flex-1 mr-4">
                            <div className="flex flex-col">
                              <span className="font-semibold flex items-center gap-2">
                                {t.description}
                                {t.status === 'pending' && (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full">
                                    Pending
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                {formatDate(t.date || t.createdAt || t.created_at)} • <span className="bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{t.category || 'Others'}</span>
                              </span>
                            </div>
                            <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {t.status === 'pending' && (
                              <button 
                                type="button"
                                onClick={() => handleMarkAsPaid(t)}
                                className="px-2 py-1 text-sm font-bold text-white bg-green-500 rounded hover:bg-green-600">
                                ✔ Pay
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => handleEditClick(t)}
                              className="px-2 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600">
                              Edit
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="px-2 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600">
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {displayedTransactions.length >= 10 && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={handleLoadMore}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                Load More
              </button>
            </div>
          )}
      </div>
    </div>
  );
}