import React, { useState } from 'react';
import { Navbar as BSNavbar, Nav, NavDropdown, Container, Badge } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { FaUser, FaCog, FaSignOutAlt, FaBell, FaHome, FaBoxes, FaExchangeAlt, FaChartBar, FaUsers } from 'react-icons/fa';

const Navbar = () => {
  // Geçici kullanıcı verisi
  const user = { name: 'Admin Kullanıcı', email: 'admin@example.com', role: 'admin' };
  const isAdmin = () => true;
  const isManager = () => true;
  const [notifications] = useState([
    { id: 1, message: 'Düşük stok uyarısı: Mermer A', type: 'warning', unread: true },
    { id: 2, message: 'Yeni kullanıcı kaydı', type: 'info', unread: true }
  ]);

  const handleLogout = () => {
    // Logout işlemi kaldırıldı
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
      <Container fluid>
        <BSNavbar.Brand href="/dashboard" className="fw-bold">
          <FaBoxes className="me-2" />
          Yüceler Makine Stok Yönetimi
        </BSNavbar.Brand>
        
        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/dashboard">
              <Nav.Link>
                <FaHome className="me-1" />
                Ana Sayfa
              </Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/materials">
              <Nav.Link>
                <FaBoxes className="me-1" />
                Malzemeler
              </Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/transactions">
              <Nav.Link>
                <FaExchangeAlt className="me-1" />
                İşlemler
              </Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/reports">
              <Nav.Link>
                <FaChartBar className="me-1" />
                Raporlar
              </Nav.Link>
            </LinkContainer>
            
            <LinkContainer to="/users">
              <Nav.Link>
                <FaUsers className="me-1" />
                Kullanıcılar
              </Nav.Link>
            </LinkContainer>
          </Nav>
          
          <Nav>
            {/* Notifications */}
            <NavDropdown
              title={
                <span className="position-relative">
                  <FaBell />
                  {unreadCount > 0 && (
                    <Badge 
                      bg="danger" 
                      pill 
                      className="position-absolute top-0 start-100 translate-middle"
                      style={{ fontSize: '0.6rem' }}
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </span>
              }
              id="notifications-dropdown"
              align="end"
            >
              {notifications.length > 0 ? (
                notifications.map(notification => (
                  <NavDropdown.Item key={notification.id} className="text-wrap" style={{ maxWidth: '300px' }}>
                    <div className={`d-flex align-items-start ${notification.unread ? 'fw-bold' : ''}`}>
                      <div className="flex-grow-1">
                        <small className={`text-${notification.type}`}>
                          {notification.message}
                        </small>
                      </div>
                      {notification.unread && (
                        <Badge bg="primary" pill className="ms-2">
                          Yeni
                        </Badge>
                      )}
                    </div>
                  </NavDropdown.Item>
                ))
              ) : (
                <NavDropdown.Item disabled>
                  Bildirim bulunmuyor
                </NavDropdown.Item>
              )}
              <NavDropdown.Divider />
              <NavDropdown.Item href="#">
                Tüm bildirimleri görüntüle
              </NavDropdown.Item>
            </NavDropdown>
            
            {/* User Menu */}
            <NavDropdown
              title={
                <span>
                  <FaUser className="me-1" />
                  {user?.name || 'Kullanıcı'}
                  {isAdmin() && <Badge bg="warning" className="ms-1">Admin</Badge>}
                  {isManager() && !isAdmin() && <Badge bg="info" className="ms-1">Yönetici</Badge>}
                </span>
              }
              id="user-dropdown"
              align="end"
            >
              <NavDropdown.Item disabled className="text-muted small">
                {user?.email}
              </NavDropdown.Item>
              <NavDropdown.Divider />
              
              <LinkContainer to="/profile">
                <NavDropdown.Item>
                  <FaUser className="me-2" />
                  Profil
                </NavDropdown.Item>
              </LinkContainer>
              
              <LinkContainer to="/settings">
                <NavDropdown.Item>
                  <FaCog className="me-2" />
                  Ayarlar
                </NavDropdown.Item>
              </LinkContainer>
              
              <NavDropdown.Divider />
              
              <NavDropdown.Item onClick={handleLogout} className="text-danger">
                <FaSignOutAlt className="me-2" />
                Çıkış Yap
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;