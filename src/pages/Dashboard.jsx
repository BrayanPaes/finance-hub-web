import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('income') 
  
  const [refresh, setRefresh] = useState(0) 
  
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) {
      navigate('/login')
      return
    }

    const fetchTransactions = async () => {
      try {
        const response = await api.get('/api/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setTransactions(response.data)
      } catch (error) {
        console.error("Erro ao buscar transações:", error)
      }
    }

    fetchTransactions()
  }, [navigate, refresh])

  const handleLogout = () => {
    localStorage.removeItem('@FinanceHub:token')
    navigate('/login')
  }

  const handleCreateTransaction = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('@FinanceHub:token')

    try {
      await api.post('/api/transactions', {
        description,
        amount: Number(amount), 
        type
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setDescription('')
      setAmount('')
      
      setRefresh(refresh + 1) 
    } catch (error) {
      console.error("Erro ao criar:", error)
      alert("Erro ao salvar transação.")
    }
  }

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0)
    
  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0)
    
  const total = income - expense

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">FinanceHub</h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600">
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

        {/* Form to create transaction */}
        <form onSubmit={handleCreateTransaction} className="p-6 mb-8 bg-white rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold">New Transaction</h2>
          
          <div className="flex flex-wrap gap-4">
            <input 
              type="text" 
              placeholder="Descrição (Ex: Salário)" 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="flex-1 p-2 border rounded"/>
            <input 
              type="number" 
              step="0.01"
              placeholder="Valor" 
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-32 p-2 border rounded"/>
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="p-2 border rounded">
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
              Salvar
            </button>
          </div>
        </form>

        {/* Transaction List */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">History</h2>
          
          {transactions.length === 0 ? (
            <p className="text-gray-500">No transactions found.</p>
          ) : (
            <ul className="space-y-3">
              {transactions.map((t, index) => (
                <li key={index} className="flex justify-between p-3 border rounded bg-gray-50">
                  <span>{t.description}</span>
                  <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}