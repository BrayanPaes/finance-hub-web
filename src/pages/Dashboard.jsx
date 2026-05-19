import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0]
  
  const [transactions, setTransactions] = useState([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('income') 
  const [date, setDate] = useState(today)
  const [editingId, setEditingId] = useState(null)
  const [showScheduled, setShowScheduled] = useState(false)
  
  const navigate = useNavigate()

  // Fetches all user transactions from the API
  const fetchTransactions = () => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) return
    
    api.get('/api/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => setTransactions(response.data))
    .catch(error => console.error("Error fetching transactions:", error))
  }

  useEffect(() => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) {
      setTimeout(() => navigate('/login'), 0)
    } else {
      fetchTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const safeAmount = Math.abs(Number(amount)) // Forces positive number

    try {
      if (editingId) {
        await api.put(`/api/transactions/${editingId}`, {
          description,
          amount: safeAmount, 
          type,
          date,
          status: transactionStatus
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await api.post('/api/transactions', {
          description,
          amount: safeAmount, 
          type,
          date,
          status: transactionStatus
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      setDescription('')
      setAmount('')
      setType('income')
      setDate(today)
      setEditingId(null)
      fetchTransactions() 
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
        date: transaction.date || today,
        status: 'paid' 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchTransactions()
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
    setEditingId(transaction.id)
  }

  // Resets the form and clears editing state
  const handleCancelEdit = () => {
    setDescription('')
    setAmount('')
    setType('income')
    setDate(today)
    setEditingId(null)
  }

  // Removes a transaction from the database
  const handleDeleteTransaction = async (id) => {
    const token = localStorage.getItem('@FinanceHub:token')
    try {
      await api.delete(`/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchTransactions() 
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

  const pendingTransactions = transactions.filter(t => t.status === 'pending')
  const hasScheduled = pendingTransactions.length > 0

  const displayedTransactions = showScheduled ? pendingTransactions : transactions

  // Formats a date string to DD/MM/YYYY format
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('T')[0].split('-')
    return `${day}/${month}/${year}`
  }

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
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-gray-500">Income</h3>
            <p className="text-2xl font-bold text-green-600">R$ {income.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-gray-500">Expenses</h3>
            <p className="text-2xl font-bold text-red-600">R$ {expense.toFixed(2)}</p>
          </div>
          <div className="p-4 text-white bg-blue-600 rounded-lg shadow">
            <h3 className="text-blue-100">Total Balance</h3>
            <p className="text-2xl font-bold">R$ {total.toFixed(2)}</p>
          </div>
        </div>

        {/* Transaction Form */}
        <form onSubmit={handleSaveTransaction} className="p-6 mb-8 bg-white rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold">
            {editingId ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          
          <div className="flex flex-wrap gap-4">
            <input 
              type="text" 
              placeholder="Description" 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="flex-1 p-2 border rounded min-w-[200px]"
            />
            <input 
              type="number" 
              step="0.01"
              min="0"
              placeholder="Amount" 
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-32 p-2 border rounded"
            />
            <input 
              type="date" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="p-2 border rounded text-gray-600"
            />
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
              {editingId ? 'Update' : 'Save'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Transaction History */}
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {showScheduled ? 'Scheduled Transactions' : 'History'}
            </h2>
            
            {hasScheduled && (
              <button 
                onClick={() => setShowScheduled(!showScheduled)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  showScheduled 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200'
                }`}
              >
                {showScheduled ? 'Show All History' : `🕒 ${pendingTransactions.length} Scheduled`}
              </button>
            )}
          </div>
          
          {displayedTransactions.length === 0 ? (
            <p className="text-gray-500">No transactions found.</p>
          ) : (
            <ul className="space-y-3">
              {displayedTransactions.map((t) => (
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
                      <span className="text-xs text-gray-500">
                        {formatDate(t.date || t.createdAt || t.created_at)}
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
                        className="px-2 py-1 text-sm font-bold text-white bg-green-500 rounded hover:bg-green-600"
                      >
                        ✔ Pay
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => handleEditClick(t)}
                      className="px-2 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteTransaction(t.id)}
                      className="px-2 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}