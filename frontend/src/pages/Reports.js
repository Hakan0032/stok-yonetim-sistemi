import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Table,
  Badge,
  Alert,
  Tabs,
  Tab,
  ProgressBar
} from 'react-bootstrap';
import {
  FaDownload,
  FaFileExcel,
  FaFilePdf,
  FaChartBar,
  FaBoxes,
  FaExchangeAlt,
  FaDollarSign,
  FaCalendarAlt
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import LoadingSpinner from '../components/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Reports = () => {
  // Temporary permission check - always allow access
  const hasPermission = (permission) => true;
  const [activeTab, setActiveTab] = useState('stock');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  
  // Stock Report Filters
  const [stockFilters, setStockFilters] = useState({
    category: '',
    status: '',
    stockLevel: '',
    format: 'json'
  });
  
  // Transaction Report Filters
  const [transactionFilters, setTransactionFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    type: '',
    material: '',
    user: '',
    format: 'json'
  });
  
  // ABC Analysis Filters
  const [abcFilters, setAbcFilters] = useState({
    period: '12',
    format: 'json'
  });
  
  // Cost Analysis Filters
  const [costFilters, setCostFilters] = useState({
    groupBy: 'category',
    period: '12',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 12)),
    endDate: new Date()
  });

  useEffect(() => {
    fetchCategories();
    fetchMaterials();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/materials/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Categories fetch error:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/api/materials?limit=1000&status=active');
      setMaterials(response.data.materials);
    } catch (error) {
      console.error('Materials fetch error:', error);
    }
  };

  const generateStockReport = async () => {
    try {
      setLoading(true);
      
      if (stockFilters.format === 'json') {
        const response = await api.get('/api/reports/stock-report', {
          params: stockFilters
        });
        setReportData(response.data);
      } else {
        // Download file
        const response = await api.get('/api/reports/stock-report', {
          params: stockFilters,
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const extension = stockFilters.format === 'excel' ? 'xlsx' : 'pdf';
        link.setAttribute('download', `stok-raporu-${new Date().toISOString().split('T')[0]}.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success('Rapor indirildi');
      }
    } catch (error) {
      console.error('Stock report error:', error);
      toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const generateTransactionReport = async () => {
    try {
      setLoading(true);
      
      const params = {
        ...transactionFilters,
        startDate: transactionFilters.startDate.toISOString(),
        endDate: transactionFilters.endDate.toISOString()
      };
      
      if (transactionFilters.format === 'json') {
        const response = await api.get('/api/reports/transaction-report', { params });
        setReportData(response.data);
      } else {
        // Download file
        const response = await api.get('/api/reports/transaction-report', {
          params,
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const extension = transactionFilters.format === 'excel' ? 'xlsx' : 'pdf';
        link.setAttribute('download', `islem-raporu-${new Date().toISOString().split('T')[0]}.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success('Rapor indirildi');
      }
    } catch (error) {
      console.error('Transaction report error:', error);
      toast.error('Rapor oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const generateABCAnalysis = async () => {
    try {
      setLoading(true);
      
      if (abcFilters.format === 'json') {
        const response = await api.get('/api/reports/abc-analysis', {
          params: abcFilters
        });
        setReportData(response.data);
      } else {
        // Download file
        const response = await api.get('/api/reports/abc-analysis', {
          params: abcFilters,
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const extension = abcFilters.format === 'excel' ? 'xlsx' : 'pdf';
        link.setAttribute('download', `abc-analizi-${new Date().toISOString().split('T')[0]}.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success('Rapor indirildi');
      }
    } catch (error) {
      console.error('ABC analysis error:', error);
      toast.error('Analiz oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const generateCostAnalysis = async () => {
    try {
      setLoading(true);
      
      const params = {
        ...costFilters,
        startDate: costFilters.startDate.toISOString(),
        endDate: costFilters.endDate.toISOString()
      };
      
      const response = await api.get('/api/reports/cost-analysis', { params });
      setReportData(response.data);
    } catch (error) {
      console.error('Cost analysis error:', error);
      toast.error('Maliyet analizi oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStockLevelBadge = (level) => {
    switch (level) {
      case 'low':
        return <Badge bg="warning">Düşük Stok</Badge>;
      case 'out':
        return <Badge bg="danger">Stok Yok</Badge>;
      case 'normal':
        return <Badge bg="success">Normal</Badge>;
      case 'overstock':
        return <Badge bg="info">Fazla Stok</Badge>;
      default:
        return <Badge bg="secondary">{level}</Badge>;
    }
  };

  const getABCBadge = (category) => {
    switch (category) {
      case 'A':
        return <Badge bg="success">A Sınıfı</Badge>;
      case 'B':
        return <Badge bg="warning">B Sınıfı</Badge>;
      case 'C':
        return <Badge bg="info">C Sınıfı</Badge>;
      default:
        return <Badge bg="secondary">{category}</Badge>;
    }
  };

  const renderStockReport = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <div className="d-flex align-items-center">
          <FaBoxes className="me-2" />
          <h5 className="mb-0">Stok Raporu</h5>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-4">
          <Col md={3}>
            <Form.Group>
              <Form.Label>Kategori</Form.Label>
              <Form.Select
                value={stockFilters.category}
                onChange={(e) => setStockFilters({ ...stockFilters, category: e.target.value })}
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Durum</Form.Label>
              <Form.Select
                value={stockFilters.status}
                onChange={(e) => setStockFilters({ ...stockFilters, status: e.target.value })}
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Stok Seviyesi</Form.Label>
              <Form.Select
                value={stockFilters.stockLevel}
                onChange={(e) => setStockFilters({ ...stockFilters, stockLevel: e.target.value })}
              >
                <option value="">Tüm Seviyeler</option>
                <option value="low">Düşük Stok</option>
                <option value="out">Stok Yok</option>
                <option value="normal">Normal</option>
                <option value="overstock">Fazla Stok</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Format</Form.Label>
              <Form.Select
                value={stockFilters.format}
                onChange={(e) => setStockFilters({ ...stockFilters, format: e.target.value })}
              >
                <option value="json">Önizleme</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        
        <div className="d-flex gap-2 mb-4">
          <Button 
            variant="primary" 
            onClick={generateStockReport}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : <FaDownload className="me-1" />}
            Rapor Oluştur
          </Button>
        </div>
        
        {reportData && reportData.materials && (
          <div>
            <Alert variant="info">
              <strong>Özet:</strong> Toplam {reportData.summary?.totalMaterials || 0} malzeme, 
              {(reportData.summary?.totalValue || 0).toLocaleString('tr-TR')} ₺ değer
            </Alert>
            
            <Table responsive>
              <thead>
                <tr>
                  <th>Malzeme</th>
                  <th>SKU</th>
                  <th>Kategori</th>
                  <th>Mevcut Stok</th>
                  <th>Birim</th>
                  <th>Birim Fiyat</th>
                  <th>Toplam Değer</th>
                  <th>Durum</th>
                  <th>Stok Seviyesi</th>
                </tr>
              </thead>
              <tbody>
                {reportData.materials.map((material) => (
                  <tr key={material._id}>
                    <td>{material.name}</td>
                    <td>{material.sku}</td>
                    <td>{material.category}</td>
                    <td className="fw-bold">{material.currentStock}</td>
                    <td>{material.unit}</td>
                    <td>{material.unitPrice.toLocaleString('tr-TR')} ₺</td>
                    <td className="fw-bold">
                      {(material.currentStock * material.unitPrice).toLocaleString('tr-TR')} ₺
                    </td>
                    <td>
                      <Badge bg={material.status === 'active' ? 'success' : 'secondary'}>
                        {material.status === 'active' ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </td>
                    <td>{getStockLevelBadge(material.stockLevel)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  const renderTransactionReport = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-success text-white">
        <div className="d-flex align-items-center">
          <FaExchangeAlt className="me-2" />
          <h5 className="mb-0">İşlem Raporu</h5>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-4">
          <Col md={3}>
            <Form.Group>
              <Form.Label>Başlangıç Tarihi</Form.Label>
              <DatePicker
                selected={transactionFilters.startDate}
                onChange={(date) => setTransactionFilters({ ...transactionFilters, startDate: date })}
                className="form-control"
                dateFormat="dd/MM/yyyy"
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Bitiş Tarihi</Form.Label>
              <DatePicker
                selected={transactionFilters.endDate}
                onChange={(date) => setTransactionFilters({ ...transactionFilters, endDate: date })}
                className="form-control"
                dateFormat="dd/MM/yyyy"
              />
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>İşlem Tipi</Form.Label>
              <Form.Select
                value={transactionFilters.type}
                onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value })}
              >
                <option value="">Tüm Tipler</option>
                <option value="in">Giriş</option>
                <option value="out">Çıkış</option>
                <option value="adjustment">Düzeltme</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Malzeme</Form.Label>
              <Form.Select
                value={transactionFilters.material}
                onChange={(e) => setTransactionFilters({ ...transactionFilters, material: e.target.value })}
              >
                <option value="">Tüm Malzemeler</option>
                {materials.map(material => (
                  <option key={material._id} value={material._id}>
                    {material.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={2}>
            <Form.Group>
              <Form.Label>Format</Form.Label>
              <Form.Select
                value={transactionFilters.format}
                onChange={(e) => setTransactionFilters({ ...transactionFilters, format: e.target.value })}
              >
                <option value="json">Önizleme</option>
                <option value="excel">Excel</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        
        <div className="d-flex gap-2 mb-4">
          <Button 
            variant="success" 
            onClick={generateTransactionReport}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : <FaDownload className="me-1" />}
            Rapor Oluştur
          </Button>
        </div>
        
        {reportData && reportData.transactions && (
          <div>
            <Alert variant="info">
              <strong>Özet:</strong> Toplam {reportData.summary?.totalTransactions || 0} işlem, 
              {(reportData.summary?.totalValue || 0).toLocaleString('tr-TR')} ₺ değer
            </Alert>
            
            <Table responsive>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tip</th>
                  <th>Malzeme</th>
                  <th>Miktar</th>
                  <th>Birim Fiyat</th>
                  <th>Toplam Değer</th>
                  <th>Kullanıcı</th>
                </tr>
              </thead>
              <tbody>
                {reportData.transactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>{new Date(transaction.createdAt).toLocaleDateString('tr-TR')}</td>
                    <td>
                      <Badge bg={transaction.type === 'in' ? 'success' : transaction.type === 'out' ? 'danger' : 'warning'}>
                        {transaction.type === 'in' ? 'Giriş' : transaction.type === 'out' ? 'Çıkış' : 'Düzeltme'}
                      </Badge>
                    </td>
                    <td>{transaction.material?.name}</td>
                    <td>{transaction.quantity} {transaction.material?.unit}</td>
                    <td>{transaction.unitPrice.toLocaleString('tr-TR')} ₺</td>
                    <td className="fw-bold">{transaction.totalValue.toLocaleString('tr-TR')} ₺</td>
                    <td>{transaction.createdBy?.name}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  const renderABCAnalysis = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-warning text-dark">
        <div className="d-flex align-items-center">
          <FaChartBar className="me-2" />
          <h5 className="mb-0">ABC Analizi</h5>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-4">
          <Col md={4}>
            <Form.Group>
              <Form.Label>Analiz Periyodu (Ay)</Form.Label>
              <Form.Select
                value={abcFilters.period}
                onChange={(e) => setAbcFilters({ ...abcFilters, period: e.target.value })}
              >
                <option value="3">Son 3 Ay</option>
                <option value="6">Son 6 Ay</option>
                <option value="12">Son 12 Ay</option>
                <option value="24">Son 24 Ay</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group>
              <Form.Label>Format</Form.Label>
              <Form.Select
                value={abcFilters.format}
                onChange={(e) => setAbcFilters({ ...abcFilters, format: e.target.value })}
              >
                <option value="json">Önizleme</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
        
        <div className="d-flex gap-2 mb-4">
          <Button 
            variant="warning" 
            onClick={generateABCAnalysis}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : <FaChartBar className="me-1" />}
            Analiz Oluştur
          </Button>
        </div>
        
        {reportData && reportData.analysis && (
          <div>
            <Row className="mb-4">
              <Col md={8}>
                <Alert variant="info">
                  <strong>ABC Analizi Özeti:</strong><br/>
                  A Sınıfı: {reportData.summary?.classA?.count || 0} malzeme (%{(reportData.summary?.classA?.percentage || 0).toFixed(1)} değer)<br/>
                  B Sınıfı: {reportData.summary?.classB?.count || 0} malzeme (%{(reportData.summary?.classB?.percentage || 0).toFixed(1)} değer)<br/>
                  C Sınıfı: {reportData.summary?.classC?.count || 0} malzeme (%{(reportData.summary?.classC?.percentage || 0).toFixed(1)} değer)
                </Alert>
              </Col>
              <Col md={4}>
                <Doughnut
                  data={{
                    labels: ['A Sınıfı', 'B Sınıfı', 'C Sınıfı'],
                    datasets: [{
                      data: [
                        reportData.summary?.classA?.percentage || 0,
                        reportData.summary?.classB?.percentage || 0,
                        reportData.summary?.classC?.percentage || 0
                      ],
                      backgroundColor: ['#28a745', '#ffc107', '#17a2b8']
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              </Col>
            </Row>
            
            <Table responsive>
              <thead>
                <tr>
                  <th>Malzeme</th>
                  <th>SKU</th>
                  <th>Kategori</th>
                  <th>Toplam Değer</th>
                  <th>Yüzde</th>
                  <th>Kümülatif %</th>
                  <th>ABC Sınıfı</th>
                </tr>
              </thead>
              <tbody>
                {reportData.analysis.map((item) => (
                  <tr key={item.material._id}>
                    <td>{item.material.name}</td>
                    <td>{item.material.sku}</td>
                    <td>{item.material.category}</td>
                    <td className="fw-bold">{item.totalValue.toLocaleString('tr-TR')} ₺</td>
                    <td>{item.percentage.toFixed(2)}%</td>
                    <td>{item.cumulativePercentage.toFixed(2)}%</td>
                    <td>{getABCBadge(item.abcClass)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  const renderCostAnalysis = () => (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-info text-white">
        <div className="d-flex align-items-center">
          <FaDollarSign className="me-2" />
          <h5 className="mb-0">Maliyet Analizi</h5>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-4">
          <Col md={3}>
            <Form.Group>
              <Form.Label>Gruplama</Form.Label>
              <Form.Select
                value={costFilters.groupBy}
                onChange={(e) => setCostFilters({ ...costFilters, groupBy: e.target.value })}
              >
                <option value="category">Kategoriye Göre</option>
                <option value="supplier">Tedarikçiye Göre</option>
                <option value="material">Malzemeye Göre</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Başlangıç Tarihi</Form.Label>
              <DatePicker
                selected={costFilters.startDate}
                onChange={(date) => setCostFilters({ ...costFilters, startDate: date })}
                className="form-control"
                dateFormat="dd/MM/yyyy"
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Bitiş Tarihi</Form.Label>
              <DatePicker
                selected={costFilters.endDate}
                onChange={(date) => setCostFilters({ ...costFilters, endDate: date })}
                className="form-control"
                dateFormat="dd/MM/yyyy"
              />
            </Form.Group>
          </Col>
        </Row>
        
        <div className="d-flex gap-2 mb-4">
          <Button 
            variant="info" 
            onClick={generateCostAnalysis}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : <FaDollarSign className="me-1" />}
            Analiz Oluştur
          </Button>
        </div>
        
        {reportData && reportData.analysis && (
          <div>
            <Alert variant="info">
              <strong>Toplam Maliyet:</strong> {(reportData.summary?.totalCost || 0).toLocaleString('tr-TR')} ₺
            </Alert>
            
            <Row>
              <Col md={8}>
                <Bar
                  data={{
                    labels: reportData.analysis.map(item => item._id),
                    datasets: [{
                      label: 'Toplam Maliyet (₺)',
                      data: reportData.analysis.map(item => item.totalCost),
                      backgroundColor: 'rgba(54, 162, 235, 0.6)',
                      borderColor: 'rgba(54, 162, 235, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top'
                      },
                      title: {
                        display: true,
                        text: 'Maliyet Dağılımı'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return value.toLocaleString('tr-TR') + ' ₺';
                          }
                        }
                      }
                    }
                  }}
                />
              </Col>
              <Col md={4}>
                <Table responsive size="sm">
                  <thead>
                    <tr>
                      <th>{costFilters.groupBy === 'category' ? 'Kategori' : costFilters.groupBy === 'supplier' ? 'Tedarikçi' : 'Malzeme'}</th>
                      <th>Toplam Maliyet</th>
                      <th>Yüzde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.analysis.map((item) => (
                      <tr key={item._id}>
                        <td>{item._id}</td>
                        <td className="fw-bold">{item.totalCost.toLocaleString('tr-TR')} ₺</td>
                        <td>{((item.totalCost / (reportData.summary?.totalCost || 1)) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Col>
            </Row>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  if (!hasPermission('canViewReports')) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning">
          <h5>Yetkisiz Erişim</h5>
          <p>Raporları görüntüleme yetkiniz bulunmamaktadır.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">Raporlar ve Analizler</h1>
              <p className="text-muted">Stok, işlem ve maliyet raporlarını görüntüleyin</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaCalendarAlt className="text-muted" />
              <span className="text-muted">{new Date().toLocaleDateString('tr-TR')}</span>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => {
              setActiveTab(k);
              setReportData(null);
            }}
            className="mb-4"
          >
            <Tab eventKey="stock" title="Stok Raporu">
              {renderStockReport()}
            </Tab>
            <Tab eventKey="transaction" title="İşlem Raporu">
              {renderTransactionReport()}
            </Tab>
            <Tab eventKey="abc" title="ABC Analizi">
              {renderABCAnalysis()}
            </Tab>
            <Tab eventKey="cost" title="Maliyet Analizi">
              {renderCostAnalysis()}
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;