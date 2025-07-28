import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Badge,
  InputGroup,
  Alert,
  Pagination
} from 'react-bootstrap';
import {
  FaPlus,
  FaSearch,
  FaDownload,
  FaArrowUp,
  FaArrowDown,
  FaEdit,
  FaTrash,
  FaEye
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import LoadingSpinner from '../components/LoadingSpinner';

const Transactions = () => {
  // Temporary permission check - always allow access
  const hasPermission = () => true;
  const [transactions, setTransactions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'view'
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    material: '',
    startDate: null,
    endDate: null
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [formData, setFormData] = useState({
    type: 'in',
    material: '',
    quantity: '',
    unitPrice: '',
    description: '',
    invoiceNumber: '',
    batchNumber: '',
    supplier: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchMaterials();
  }, [pagination.page, pagination.limit, searchTerm, filters, sortBy, sortOrder]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy,
        sortOrder
      };

      // Only add non-empty filter values
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== '') {
          if (key === 'startDate' || key === 'endDate') {
            params[key] = filters[key].toISOString();
          } else {
            params[key] = filters[key];
          }
        }
      });

      const response = await api.get('/api/transactions', { params });
      setTransactions(response.data.transactions);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        pages: response.data.totalPages
      }));
    } catch (error) {
      console.error('Transactions fetch error:', error);
      toast.error('İşlemler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
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

  const handleShowModal = (mode, transaction = null) => {
    setModalMode(mode);
    setSelectedTransaction(transaction);
    
    if (transaction && mode === 'view') {
      // View mode - just show the transaction
    } else {
      // Add mode - reset form
      setFormData({
        type: 'in',
        material: '',
        quantity: '',
        unitPrice: '',
        description: '',
        invoiceNumber: '',
        batchNumber: '',
        supplier: ''
      });
    }
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
    setFormData({
      type: 'in',
      material: '',
      quantity: '',
      unitPrice: '',
      description: '',
      invoiceNumber: '',
      batchNumber: '',
      supplier: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/api/transactions', formData);
      toast.success('İşlem başarıyla eklendi');
      handleCloseModal();
      fetchTransactions();
    } catch (error) {
      console.error('Transaction save error:', error);
      toast.error(error.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('Bu işlemi silmek istediğinizden emin misiniz?')) {
      try {
        await api.delete(`/api/transactions/${transactionId}`);
        toast.success('İşlem başarıyla silindi');
        fetchTransactions();
      } catch (error) {
        console.error('Transaction delete error:', error);
        toast.error(error.response?.data?.message || 'Silme işlemi başarısız');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getTransactionBadge = (type) => {
    switch (type) {
      case 'in':
        return <Badge bg="success"><FaArrowUp className="me-1" />Giriş</Badge>;
      case 'out':
        return <Badge bg="danger"><FaArrowDown className="me-1" />Çıkış</Badge>;
      case 'adjustment':
        return <Badge bg="warning">Düzeltme</Badge>;
      default:
        return <Badge bg="secondary">{type}</Badge>;
    }
  };

  const exportToExcel = async () => {
    try {
      const params = {
        format: 'excel',
        ...filters
      };
      
      if (filters.startDate) {
        params.startDate = filters.startDate.toISOString();
      }
      if (filters.endDate) {
        params.endDate = filters.endDate.toISOString();
      }

      const response = await api.get('/api/reports/transaction-report', {
        params,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `islemler-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Excel dosyası indirildi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Dışa aktarma başarısız');
    }
  };

  const handleMaterialChange = (materialId) => {
    const selectedMaterial = materials.find(m => m._id === materialId);
    setFormData(prev => ({
      ...prev,
      material: materialId,
      unitPrice: selectedMaterial ? selectedMaterial.unitPrice : ''
    }));
  };

  if (loading && transactions.length === 0) {
    return <LoadingSpinner text="İşlemler yükleniyor..." />;
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">Stok İşlemleri</h1>
              <p className="text-muted">Giriş, çıkış ve düzeltme işlemlerini yönetin</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-success" onClick={exportToExcel}>
                <FaDownload className="me-1" />
                Excel İndir
              </Button>
              {hasPermission('canManageTransactions') && (
                <Button variant="primary" onClick={() => handleShowModal('add')}>
                  <FaPlus className="me-1" />
                  Yeni İşlem
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Row className="g-3">
                <Col md={3}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="İşlem ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="">Tüm Tipler</option>
                    <option value="in">Giriş</option>
                    <option value="out">Çıkış</option>
                    <option value="adjustment">Düzeltme</option>
                  </Form.Select>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={filters.material}
                    onChange={(e) => handleFilterChange('material', e.target.value)}
                  >
                    <option value="">Tüm Malzemeler</option>
                    {materials.map(material => (
                      <option key={material._id} value={material._id}>
                        {material.name}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                
                <Col md={2}>
                  <DatePicker
                    selected={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    placeholderText="Başlangıç tarihi"
                    className="form-control"
                    dateFormat="dd/MM/yyyy"
                  />
                </Col>
                
                <Col md={2}>
                  <DatePicker
                    selected={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    placeholderText="Bitiş tarihi"
                    className="form-control"
                    dateFormat="dd/MM/yyyy"
                  />
                </Col>
                
                <Col md={1}>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => {
                      setFilters({ type: '', material: '', startDate: null, endDate: null });
                      setSearchTerm('');
                    }}
                  >
                    Temizle
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Transactions Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <LoadingSpinner size="sm" text="Yükleniyor..." />
                </div>
              ) : transactions.length > 0 ? (
                <>
                  <Table responsive className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('createdAt')}
                        >
                          Tarih {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Tip</th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('material')}
                        >
                          Malzeme {sortBy === 'material' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('quantity')}
                        >
                          Miktar {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('unitPrice')}
                        >
                          Birim Fiyat {sortBy === 'unitPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('totalValue')}
                        >
                          Toplam Değer {sortBy === 'totalValue' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Açıklama</th>
                        <th>Kullanıcı</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction._id}>
                          <td className="small">
                            {new Date(transaction.createdAt).toLocaleString('tr-TR')}
                          </td>
                          <td>{getTransactionBadge(transaction.type)}</td>
                          <td>
                            <div>
                              <div className="fw-semibold">{transaction.material?.name}</div>
                              <small className="text-muted">{transaction.material?.sku}</small>
                            </div>
                          </td>
                          <td className="fw-bold">
                            {transaction.quantity} {transaction.material?.unit}
                          </td>
                          <td>{transaction.unitPrice?.toLocaleString('tr-TR')} ₺</td>
                          <td className="fw-bold">
                            {transaction.totalValue?.toLocaleString('tr-TR')} ₺
                          </td>
                          <td>
                            <small>
                              {transaction.description?.substring(0, 30)}
                              {transaction.description?.length > 30 && '...'}
                            </small>
                          </td>
                          <td className="small">
                            {transaction.createdBy?.name}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleShowModal('view', transaction)}
                              >
                                <FaEye />
                              </Button>
                              {hasPermission('canManageTransactions') && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(transaction._id)}
                                >
                                  <FaTrash />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  
                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center p-3">
                      <div className="text-muted">
                        Toplam {pagination.total} işlemden {((pagination.page - 1) * pagination.limit) + 1}-
                        {Math.min(pagination.page * pagination.limit, pagination.total)} arası gösteriliyor
                      </div>
                      <Pagination className="mb-0">
                        <Pagination.Prev 
                          disabled={pagination.page === 1}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        />
                        {[...Array(pagination.pages)].map((_, index) => (
                          <Pagination.Item
                            key={index + 1}
                            active={pagination.page === index + 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: index + 1 }))}
                          >
                            {index + 1}
                          </Pagination.Item>
                        ))}
                        <Pagination.Next 
                          disabled={pagination.page === pagination.pages}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <FaArrowUp size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">İşlem bulunamadı</h5>
                  <p className="text-muted">Arama kriterlerinizi değiştirin veya yeni işlem ekleyin.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Transaction Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === 'add' ? 'Yeni İşlem Ekle' : 'İşlem Detayları'}
          </Modal.Title>
        </Modal.Header>
        
        {modalMode === 'view' && selectedTransaction ? (
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <strong>Tarih:</strong>
                <p>{new Date(selectedTransaction.createdAt).toLocaleString('tr-TR')}</p>
              </Col>
              <Col md={6}>
                <strong>Tip:</strong>
                <p>{getTransactionBadge(selectedTransaction.type)}</p>
              </Col>
              <Col md={6}>
                <strong>Malzeme:</strong>
                <p>{selectedTransaction.material?.name} ({selectedTransaction.material?.sku})</p>
              </Col>
              <Col md={6}>
                <strong>Miktar:</strong>
                <p>{selectedTransaction.quantity} {selectedTransaction.material?.unit}</p>
              </Col>
              <Col md={6}>
                <strong>Birim Fiyat:</strong>
                <p>{selectedTransaction.unitPrice?.toLocaleString('tr-TR')} ₺</p>
              </Col>
              <Col md={6}>
                <strong>Toplam Değer:</strong>
                <p className="fw-bold">{selectedTransaction.totalValue?.toLocaleString('tr-TR')} ₺</p>
              </Col>
              {selectedTransaction.invoiceNumber && (
                <Col md={6}>
                  <strong>Fatura No:</strong>
                  <p>{selectedTransaction.invoiceNumber}</p>
                </Col>
              )}
              {selectedTransaction.batchNumber && (
                <Col md={6}>
                  <strong>Parti No:</strong>
                  <p>{selectedTransaction.batchNumber}</p>
                </Col>
              )}
              {selectedTransaction.description && (
                <Col md={12}>
                  <strong>Açıklama:</strong>
                  <p>{selectedTransaction.description}</p>
                </Col>
              )}
              <Col md={6}>
                <strong>İşlemi Yapan:</strong>
                <p>{selectedTransaction.createdBy?.name} ({selectedTransaction.createdBy?.email})</p>
              </Col>
            </Row>
          </Modal.Body>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>İşlem Tipi *</Form.Label>
                    <Form.Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                    >
                      <option value="in">Giriş</option>
                      <option value="out">Çıkış</option>
                      <option value="adjustment">Düzeltme</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Malzeme *</Form.Label>
                    <Form.Select
                      value={formData.material}
                      onChange={(e) => handleMaterialChange(e.target.value)}
                      required
                    >
                      <option value="">Malzeme seçin</option>
                      {materials.map(material => (
                        <option key={material._id} value={material._id}>
                          {material.name} ({material.sku}) - Stok: {material.currentStock} {material.unit}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Miktar *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Birim Fiyat (₺) *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Fatura No</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Parti No</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Açıklama</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                {formData.quantity && formData.unitPrice && (
                  <Col md={12}>
                    <Alert variant="info">
                      <strong>Toplam Değer: </strong>
                      {(parseFloat(formData.quantity) * parseFloat(formData.unitPrice)).toLocaleString('tr-TR')} ₺
                    </Alert>
                  </Col>
                )}
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseModal}>
                İptal
              </Button>
              <Button variant="primary" type="submit">
                İşlemi Kaydet
              </Button>
            </Modal.Footer>
          </Form>
        )}
        
        {modalMode === 'view' && (
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Kapat
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </Container>
  );
};

export default Transactions;