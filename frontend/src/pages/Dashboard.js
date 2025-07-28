import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Alert, Button } from 'react-bootstrap';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import { FaBoxes, FaExclamationTriangle, FaArrowUp, FaArrowDown, FaDollarSign, FaUsers, FaChartLine } from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const Dashboard = () => {
  // const { user, hasPermission } = useAuth();
  const user = { name: 'Kullanıcı' }; // Temporary user object
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    overview: {},
    alerts: [],
    trends: [],
    topMaterials: [],
    recentTransactions: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overviewRes, alertsRes, trendsRes, topMaterialsRes, transactionsRes] = await Promise.all([
        api.get('/api/dashboard/overview'),
        api.get('/api/dashboard/stock-alerts'),
        api.get('/api/dashboard/transaction-trends?period=30d'),
        api.get('/api/dashboard/top-materials?limit=5'),
        api.get('/api/transactions?limit=10&sort=-createdAt')
      ]);

      setDashboardData({
        overview: overviewRes.data.overview,
        alerts: alertsRes.data,
        trends: trendsRes.data.trends || [],
        topMaterials: topMaterialsRes.data.topMaterials || [],
        recentTransactions: transactionsRes.data.transactions || []
      });
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('Dashboard verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Dashboard yükleniyor..." />;
  }

  const { overview, alerts, trends, topMaterials, recentTransactions } = dashboardData;

  // Chart configurations
  const trendChartData = {
    labels: trends.filter(t => t._id.type === 'in').map(t => {
      const date = t._id.date;
      return new Date(date.year, date.month - 1, date.day || 1).toLocaleDateString('tr-TR');
    }),
    datasets: [
      {
        label: 'Giriş',
        data: trends.filter(t => t._id.type === 'in').map(t => t.totalValue || 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Çıkış',
        data: trends.filter(t => t._id.type === 'out').map(t => t.totalValue || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };

  const stockDistributionData = {
    labels: ['Normal Stok', 'Düşük Stok', 'Tükenen Stok'],
    datasets: [
      {
        data: [
          (overview.totalMaterials || 0) - (overview.lowStockMaterials || 0) - (overview.outOfStockMaterials || 0),
          overview.lowStockMaterials || 0,
          overview.outOfStockMaterials || 0
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const topMaterialsChartData = {
    labels: topMaterials.map(m => m.name?.substring(0, 20) + (m.name?.length > 20 ? '...' : '')),
    datasets: [
      {
        label: 'Toplam Değer (TL)',
        data: topMaterials.map(m => m.totalValue),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <Container fluid className="py-4 dashboard-container">
      {/* Welcome Section */}
      <Row className="mb-4">
        <Col>
          <div className="welcome-header">
            <h1 className="display-5 fw-bold text-gradient mb-2">Hoş geldiniz!</h1>
            <p className="lead text-muted">Yüceler Makine stok yönetim sistemi ana sayfası</p>
          </div>
        </Col>
      </Row>

      {/* Overview Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <div className="modern-card gradient-primary h-100">
            <div className="card-content d-flex align-items-center">
              <div className="icon-wrapper">
                <FaBoxes size={32} className="text-white" />
              </div>
              <div className="flex-grow-1 ms-3">
                <div className="stat-number text-white">{overview.totalMaterials || 0}</div>
                <div className="stat-label text-white-50">Toplam Malzeme</div>
              </div>
            </div>
          </div>
        </Col>
        
        <Col md={3} className="mb-3">
          <div className="modern-card gradient-success h-100">
            <div className="card-content d-flex align-items-center">
              <div className="icon-wrapper">
                <FaDollarSign size={32} className="text-white" />
              </div>
              <div className="flex-grow-1 ms-3">
                <div className="stat-number text-white">
                  {(overview.totalStockValue || 0).toLocaleString('tr-TR')} ₺
                </div>
                <div className="stat-label text-white-50">Toplam Stok Değeri</div>
              </div>
            </div>
          </div>
        </Col>
        
        <Col md={3} className="mb-3">
          <div className="modern-card gradient-warning h-100">
            <div className="card-content d-flex align-items-center">
              <div className="icon-wrapper">
                <FaExclamationTriangle size={32} className="text-white" />
              </div>
              <div className="flex-grow-1 ms-3">
                <div className="stat-number text-white">{overview.lowStockMaterials || 0}</div>
                <div className="stat-label text-white-50">Düşük Stok</div>
              </div>
            </div>
          </div>
        </Col>
        
        <Col md={3} className="mb-3">
          <div className="modern-card gradient-info h-100">
            <div className="card-content d-flex align-items-center">
              <div className="icon-wrapper">
                <FaChartLine size={32} className="text-white" />
              </div>
              <div className="flex-grow-1 ms-3">
                <div className="stat-number text-white">{overview.todayTransactions || 0}</div>
                <div className="stat-label text-white-50">Günlük İşlem</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Alerts */}
      {(alerts.lowStock?.length > 0 || alerts.outOfStock?.length > 0) && (
        <Row className="mb-4">
          <Col>
            <div className="modern-card glass-effect">
              <div className="card-header-modern">
                <h5 className="mb-0 d-flex align-items-center">
                  <FaExclamationTriangle className="text-warning me-2" />
                  Stok Uyarıları
                </h5>
              </div>
              <div className="card-content">
                {alerts.lowStock?.slice(0, 3).map((material, index) => (
                  <Alert key={`low-${index}`} variant="warning" className="mb-2">
                    <strong>{material.name}</strong> - Düşük stok
                    <Badge bg="secondary" className="ms-2">
                      Mevcut: {material.currentStock} / Min: {material.minStock}
                    </Badge>
                  </Alert>
                ))}
                {alerts.outOfStock?.slice(0, 2).map((material, index) => (
                  <Alert key={`out-${index}`} variant="danger" className="mb-2">
                    <strong>{material.name}</strong> - Stok tükendi
                    <Badge bg="secondary" className="ms-2">
                      SKU: {material.sku}
                    </Badge>
                  </Alert>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Charts */}
      <Row className="mb-4">
        <Col lg={8} className="mb-3">
          <div className="modern-card glass-effect h-100">
            <div className="card-header-modern">
              <h5 className="mb-0">İşlem Trendleri (Son 30 Gün)</h5>
            </div>
            <div className="card-content">
              {trends.length > 0 ? (
                <Line data={trendChartData} options={chartOptions} />
              ) : (
                <div className="text-center text-muted py-5">
                  <div className="empty-state">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <p>Trend verisi bulunmuyor</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Col>
        
        <Col lg={4} className="mb-3">
          <div className="modern-card glass-effect h-100">
            <div className="card-header-modern">
              <h5 className="mb-0">Stok Dağılımı</h5>
            </div>
            <div className="card-content">
              <Doughnut data={stockDistributionData} options={{ responsive: true }} />
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Top Materials */}
        <Col lg={6} className="mb-3">
          <div className="modern-card glass-effect h-100">
            <div className="card-header-modern">
              <h5 className="mb-0">En Değerli Malzemeler</h5>
            </div>
            <div className="card-content">
              {topMaterials.length > 0 ? (
                <Bar data={topMaterialsChartData} options={chartOptions} />
              ) : (
                <div className="text-center text-muted py-5">
                  <div className="empty-state">
                    <FaBoxes size={48} className="text-muted mb-3" />
                    <p>Malzeme verisi bulunmuyor</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Col>
        
        {/* Recent Transactions */}
        <Col lg={6} className="mb-3">
          <div className="modern-card glass-effect h-100">
            <div className="card-header-modern d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Son İşlemler</h5>
              <Button variant="outline-primary" size="sm" href="/transactions" className="btn-modern">
                Tümünü Görüntüle
              </Button>
            </div>
            <div className="card-content p-0">
              {recentTransactions.length > 0 ? (
                <Table responsive className="mb-0 modern-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Malzeme</th>
                      <th>Tip</th>
                      <th>Miktar</th>
                      <th>Değer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.slice(0, 8).map((transaction) => (
                      <tr key={transaction._id}>
                        <td className="small">
                          {new Date(transaction.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="small">
                          {transaction.material?.name?.substring(0, 20)}
                          {transaction.material?.name?.length > 20 && '...'}
                        </td>
                        <td>
                          <Badge bg={
                            transaction.type === 'in' ? 'success' : 
                            transaction.type === 'out' ? 'danger' : 'warning'
                          }>
                            {transaction.type === 'in' ? (
                              <><FaArrowUp className="me-1" />Giriş</>
                            ) : transaction.type === 'out' ? (
                              <><FaArrowDown className="me-1" />Çıkış</>
                            ) : (
                              'Düzeltme'
                            )}
                          </Badge>
                        </td>
                        <td className="small">
                          {transaction.quantity} {transaction.material?.unit}
                        </td>
                        <td className="small">
                          {transaction.totalValue?.toLocaleString('tr-TR')} ₺
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center text-muted py-5">
                  <div className="empty-state">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <p>İşlem bulunmuyor</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;