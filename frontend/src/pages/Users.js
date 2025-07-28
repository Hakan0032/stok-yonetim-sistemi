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
  Pagination,
  Dropdown
} from 'react-bootstrap';
import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaUserShield,
  FaUserTie,
  FaUser,
  FaCheck,
  FaTimes,
  FaKey
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const Users = () => {
  // Temporary user data and permission check
  const user = { role: 'admin', name: 'Test User' };
  const hasPermission = () => true;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    department: ''
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
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
    isActive: true,
    permissions: {
      canViewDashboard: true,
      canViewMaterials: true,
      canManageMaterials: false,
      canViewTransactions: true,
      canManageTransactions: false,
      canViewReports: false,
      canManageUsers: false,
      canManageSettings: false
    }
  });

  const departments = [
    'Genel Müdürlük',
    'İnsan Kaynakları',
    'Muhasebe',
    'Satış',
    'Pazarlama',
    'Üretim',
    'Kalite Kontrol',
    'Lojistik',
    'Bilgi İşlem',
    'Ar-Ge'
  ];

  const permissionLabels = {
    canViewDashboard: 'Dashboard Görüntüleme',
    canViewMaterials: 'Malzeme Görüntüleme',
    canManageMaterials: 'Malzeme Yönetimi',
    canViewTransactions: 'İşlem Görüntüleme',
    canManageTransactions: 'İşlem Yönetimi',
    canViewReports: 'Rapor Görüntüleme',
    canManageUsers: 'Kullanıcı Yönetimi',
    canManageSettings: 'Sistem Ayarları'
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit, searchTerm, filters, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy,
        sortOrder,
        ...filters
      };

      const response = await api.get('/api/users', { params });
      
      // Handle both old format (direct array) and new format (with pagination)
      if (response.data.users) {
        // New paginated format
        setUsers(response.data.users);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          pages: response.data.pagination.pages
        }));
      } else {
        // Old format (direct array)
        setUsers(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.length,
          pages: Math.ceil(response.data.length / prev.limit)
        }));
      }
    } catch (error) {
      console.error('Users fetch error:', error);
      toast.error('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (mode, userData = null) => {
    setModalMode(mode);
    setSelectedUser(userData);
    
    if (userData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: userData.name,
        email: userData.email,
        password: '',
        role: userData.role,
        department: userData.department || '',
        isActive: userData.isActive,
        permissions: userData.permissions || {
          canViewDashboard: true,
          canViewMaterials: true,
          canManageMaterials: false,
          canViewTransactions: true,
          canManageTransactions: false,
          canViewReports: false,
          canManageUsers: false,
          canManageSettings: false
        }
      });
    } else {
      // Add mode - reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        department: '',
        isActive: true,
        permissions: {
          canViewDashboard: true,
          canViewMaterials: true,
          canManageMaterials: false,
          canViewTransactions: true,
          canManageTransactions: false,
          canViewReports: false,
          canManageUsers: false,
          canManageSettings: false
        }
      });
    }
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      department: '',
      isActive: true,
      permissions: {
        canViewDashboard: true,
        canViewMaterials: true,
        canManageMaterials: false,
        canViewTransactions: true,
        canManageTransactions: false,
        canViewReports: false,
        canManageUsers: false,
        canManageSettings: false
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'add') {
        await api.post('/api/users', formData);
        toast.success('Kullanıcı başarıyla eklendi');
      } else if (modalMode === 'edit') {
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await api.put(`/api/users/${selectedUser._id}`, updateData);
        toast.success('Kullanıcı başarıyla güncellendi');
      }
      
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error('User save error:', error);
      toast.error(error.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === user._id) {
      toast.error('Kendi hesabınızı silemezsiniz');
      return;
    }
    
    if (window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      try {
        await api.delete(`/api/users/${userId}`);
        toast.success('Kullanıcı başarıyla silindi');
        fetchUsers();
      } catch (error) {
        console.error('User delete error:', error);
        toast.error(error.response?.data?.message || 'Silme işlemi başarısız');
      }
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    if (userId === user._id) {
      toast.error('Kendi hesabınızın durumunu değiştiremezsiniz');
      return;
    }
    
    try {
      await api.put(`/api/users/${userId}/toggle-status`);
      toast.success('Kullanıcı durumu güncellendi');
      fetchUsers();
    } catch (error) {
      console.error('Status toggle error:', error);
      toast.error('Durum güncellenirken hata oluştu');
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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Badge bg="danger"><FaUserShield className="me-1" />Admin</Badge>;
      case 'manager':
        return <Badge bg="warning"><FaUserTie className="me-1" />Yönetici</Badge>;
      case 'user':
        return <Badge bg="primary"><FaUser className="me-1" />Kullanıcı</Badge>;
      default:
        return <Badge bg="secondary">{role}</Badge>;
    }
  };

  const handlePermissionChange = (permission, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value
      }
    }));
  };

  const handleRoleChange = (role) => {
    let defaultPermissions = {
      canViewDashboard: true,
      canViewMaterials: true,
      canManageMaterials: false,
      canViewTransactions: true,
      canManageTransactions: false,
      canViewReports: false,
      canManageUsers: false,
      canManageSettings: false
    };

    if (role === 'manager') {
      defaultPermissions = {
        ...defaultPermissions,
        canManageMaterials: true,
        canManageTransactions: true,
        canViewReports: true
      };
    } else if (role === 'admin') {
      defaultPermissions = {
        canViewDashboard: true,
        canViewMaterials: true,
        canManageMaterials: true,
        canViewTransactions: true,
        canManageTransactions: true,
        canViewReports: true,
        canManageUsers: true,
        canManageSettings: true
      };
    }

    setFormData(prev => ({
      ...prev,
      role,
      permissions: defaultPermissions
    }));
  };

  if (!hasPermission('canManageUsers')) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning">
          <h5>Yetkisiz Erişim</h5>
          <p>Kullanıcı yönetimi yetkiniz bulunmamaktadır.</p>
        </Alert>
      </Container>
    );
  }

  if (loading && users.length === 0) {
    return <LoadingSpinner text="Kullanıcılar yükleniyor..." />;
  }

  return (
    <Container fluid className="py-4 users-container">
      <Row className="mb-4">
        <Col>
          <div className="page-header d-flex justify-content-between align-items-center">
            <div>
              <h1 className="display-6 fw-bold text-gradient mb-2">Kullanıcı Yönetimi</h1>
              <p className="lead text-muted">Sistem kullanıcılarını yönetin</p>
            </div>
            <Button variant="primary" onClick={() => handleShowModal('add')} className="btn-modern btn-gradient">
              <FaPlus className="me-2" />
              Yeni Kullanıcı
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <div className="modern-card glass-effect">
            <div className="card-content">
              <Row className="g-3">
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Kullanıcı ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                  >
                    <option value="">Tüm Roller</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Yönetici</option>
                    <option value="user">Kullanıcı</option>
                  </Form.Select>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">Tüm Durumlar</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </Form.Select>
                </Col>
                
                <Col md={3}>
                  <Form.Select
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                  >
                    <option value="">Tüm Departmanlar</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </Form.Select>
                </Col>
                
                <Col md={1}>
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => {
                      setFilters({ role: '', status: '', department: '' });
                      setSearchTerm('');
                    }}
                  >
                    Temizle
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>

      {/* Users Table */}
      <Row>
        <Col>
          <div className="modern-card glass-effect">
            <div className="card-content p-0">
              {loading ? (
                <div className="text-center py-5">
                  <LoadingSpinner size="sm" text="Yükleniyor..." />
                </div>
              ) : users.length > 0 ? (
                <>
                  <Table responsive className="mb-0 modern-table">
                    <thead>
                      <tr>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('name')}
                        >
                          Ad Soyad {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('email')}
                        >
                          E-posta {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Rol</th>
                        <th>Departman</th>
                        <th>Durum</th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('lastLogin')}
                        >
                          Son Giriş {sortBy === 'lastLogin' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('createdAt')}
                        >
                          Kayıt Tarihi {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userData) => (
                        <tr key={userData._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2">
                                {userData.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-semibold">{userData.name}</div>
                                {userData._id === user._id && (
                                  <small className="text-muted">(Siz)</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{userData.email}</td>
                          <td>{getRoleBadge(userData.role)}</td>
                          <td>
                            <small className="text-muted">
                              {userData.department || 'Belirtilmemiş'}
                            </small>
                          </td>
                          <td>
                            <Badge bg={userData.isActive ? 'success' : 'secondary'}>
                              {userData.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </td>
                          <td className="small">
                            {userData.lastLogin 
                              ? new Date(userData.lastLogin).toLocaleString('tr-TR')
                              : 'Hiç giriş yapmamış'
                            }
                          </td>
                          <td className="small">
                            {new Date(userData.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td>
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                İşlemler
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleShowModal('view', userData)}>
                                  <FaEye className="me-1" /> Görüntüle
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => handleShowModal('edit', userData)}>
                                  <FaEdit className="me-1" /> Düzenle
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  onClick={() => handleStatusToggle(userData._id, userData.isActive)}
                                  disabled={userData._id === user._id}
                                >
                                  {userData.isActive ? (
                                    <><FaTimes className="me-1" /> Pasifleştir</>
                                  ) : (
                                    <><FaCheck className="me-1" /> Aktifleştir</>
                                  )}
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item 
                                  className="text-danger"
                                  onClick={() => handleDelete(userData._id)}
                                  disabled={userData._id === user._id}
                                >
                                  <FaTrash className="me-1" /> Sil
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  
                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center p-3">
                      <div className="text-muted">
                        Toplam {pagination.total} kullanıcıdan {((pagination.page - 1) * pagination.limit) + 1}-
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
                  <div className="empty-state">
                    <FaUser size={48} className="text-muted mb-3" />
                    <h5 className="text-muted">Kullanıcı bulunamadı</h5>
                    <p className="text-muted">Arama kriterlerinizi değiştirin veya yeni kullanıcı ekleyin.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* User Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === 'add' ? 'Yeni Kullanıcı Ekle' : 
             modalMode === 'edit' ? 'Kullanıcı Düzenle' : 'Kullanıcı Detayları'}
          </Modal.Title>
        </Modal.Header>
        
        {modalMode === 'view' && selectedUser ? (
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <strong>Ad Soyad:</strong>
                <p>{selectedUser.name}</p>
              </Col>
              <Col md={6}>
                <strong>E-posta:</strong>
                <p>{selectedUser.email}</p>
              </Col>
              <Col md={6}>
                <strong>Rol:</strong>
                <p>{getRoleBadge(selectedUser.role)}</p>
              </Col>
              <Col md={6}>
                <strong>Departman:</strong>
                <p>{selectedUser.department || 'Belirtilmemiş'}</p>
              </Col>
              <Col md={6}>
                <strong>Durum:</strong>
                <p>
                  <Badge bg={selectedUser.isActive ? 'success' : 'secondary'}>
                    {selectedUser.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </p>
              </Col>
              <Col md={6}>
                <strong>Son Giriş:</strong>
                <p>
                  {selectedUser.lastLogin 
                    ? new Date(selectedUser.lastLogin).toLocaleString('tr-TR')
                    : 'Hiç giriş yapmamış'
                  }
                </p>
              </Col>
              <Col md={12}>
                <strong>Yetkiler:</strong>
                <div className="mt-2">
                  {Object.entries(selectedUser.permissions || {}).map(([key, value]) => (
                    <Badge 
                      key={key} 
                      bg={value ? 'success' : 'secondary'} 
                      className="me-2 mb-1"
                    >
                      {permissionLabels[key] || key}
                    </Badge>
                  ))}
                </div>
              </Col>
            </Row>
          </Modal.Body>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Ad Soyad *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={modalMode === 'view'}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>E-posta *</Form.Label>
                    <Form.Control
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={modalMode === 'view'}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>
                      Şifre {modalMode === 'add' ? '*' : '(Değiştirmek için doldurun)'}
                    </Form.Label>
                    <Form.Control
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={modalMode === 'add'}
                      disabled={modalMode === 'view'}
                      placeholder={modalMode === 'edit' ? 'Şifreyi değiştirmek için doldurun' : ''}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Rol *</Form.Label>
                    <Form.Select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      required
                      disabled={modalMode === 'view'}
                    >
                      <option value="user">Kullanıcı</option>
                      <option value="manager">Yönetici</option>
                      <option value="admin">Admin</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Departman</Form.Label>
                    <Form.Select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      disabled={modalMode === 'view'}
                    >
                      <option value="">Departman seçin</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Durum</Form.Label>
                    <Form.Check
                      type="switch"
                      id="isActive"
                      label={formData.isActive ? 'Aktif' : 'Pasif'}
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      disabled={modalMode === 'view'}
                    />
                  </Form.Group>
                </Col>
                
                {/* Permissions */}
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Yetkiler</Form.Label>
                    <Row className="g-2">
                      {Object.entries(permissionLabels).map(([key, label]) => (
                        <Col md={6} key={key}>
                          <Form.Check
                            type="checkbox"
                            id={key}
                            label={label}
                            checked={formData.permissions[key] || false}
                            onChange={(e) => handlePermissionChange(key, e.target.checked)}
                            disabled={modalMode === 'view'}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseModal}>
                İptal
              </Button>
              <Button variant="primary" type="submit">
                {modalMode === 'add' ? 'Kullanıcı Ekle' : 'Güncelle'}
              </Button>
            </Modal.Footer>
          </Form>
        )}
        
        {modalMode === 'view' && (
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Kapat
            </Button>
            <Button variant="primary" onClick={() => handleShowModal('edit', selectedUser)}>
              <FaEdit className="me-1" /> Düzenle
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </Container>
  );
};

export default Users;