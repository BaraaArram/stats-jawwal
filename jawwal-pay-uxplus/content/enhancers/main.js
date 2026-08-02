// Dashboard page enhancer
// Restyles sidebar, DataTables, and header bar while preserving all functionality

function enhanceMainPage() {
  try {
    const transactionHistoryTable = document.querySelector('#transactionHistoryTable');
    if (!transactionHistoryTable) {
      console.log('[JawwalPay UX+] Transaction history table not found, skipping enhancement');
      return;
    }

    console.log('[JawwalPay UX+] Enhancing dashboard page...');

    // Restyle sidebar/menu service widgets
    const serviceWidgets = document.querySelectorAll('.j-widget-inner-box');
    serviceWidgets.forEach(widget => {
      widget.style.borderRadius = 'var(--jp-radius-lg)';
      widget.style.boxShadow = 'var(--jp-shadow-sm)';
      widget.style.transition = 'all var(--jp-transition-base)';
      widget.style.cursor = 'pointer';
      
      widget.addEventListener('mouseenter', () => {
        widget.style.boxShadow = 'var(--jp-shadow-md)';
        widget.style.transform = 'translateY(-2px)';
      });
      
      widget.addEventListener('mouseleave', () => {
        widget.style.boxShadow = 'var(--jp-shadow-sm)';
        widget.style.transform = 'translateY(0)';
      });
    });

    // Restyle main menu dropdown
    const mainMenuDropdowns = document.querySelectorAll('.notika-main-menu-dropdown');
    mainMenuDropdowns.forEach(menu => {
      menu.style.display = 'flex';
      menu.style.flexWrap = 'wrap';
      menu.style.gap = 'var(--jp-space-3)';
      menu.style.padding = 'var(--jp-space-4)';
      
      const menuItems = menu.querySelectorAll('li');
      menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (link) {
          link.style.padding = 'var(--jp-space-3) var(--jp-space-4)';
          link.style.borderRadius = 'var(--jp-radius-md)';
          link.style.transition = 'all var(--jp-transition-fast)';
          link.style.display = 'inline-flex';
          link.style.alignItems = 'center';
          link.style.gap = 'var(--jp-space-2)';
          
          if (item.classList.contains('active')) {
            link.style.background = 'var(--jp-color-primary-50)';
            link.style.color = 'var(--jp-color-primary-700)';
          }
          
          link.addEventListener('mouseenter', () => {
            if (!item.classList.contains('active')) {
              link.style.background = 'var(--jp-color-gray-100)';
            }
          });
          
          link.addEventListener('mouseleave', () => {
            if (!item.classList.contains('active')) {
              link.style.background = 'transparent';
            }
          });
        }
      });
    });

    // Restyle DataTables wrappers
    const dataTablesWrappers = document.querySelectorAll('.dataTables_wrapper');
    dataTablesWrappers.forEach(wrapper => {
      wrapper.style.background = 'white';
      wrapper.style.borderRadius = 'var(--jp-radius-lg)';
      wrapper.style.boxShadow = 'var(--jp-shadow-sm)';
      wrapper.style.padding = 'var(--jp-space-4)';
      wrapper.style.border = '1px solid var(--jp-color-gray-200)';
    });

    // Restyle DataTables filter/search
    const dataTablesFilters = document.querySelectorAll('.dataTables_filter');
    dataTablesFilters.forEach(filter => {
      filter.style.marginBottom = 'var(--jp-space-4)';
      
      const input = filter.querySelector('input');
      if (input) {
        input.style.borderRadius = 'var(--jp-radius-md)';
        input.style.border = '1px solid var(--jp-color-gray-300)';
        input.style.padding = 'var(--jp-space-2) var(--jp-space-3)';
        input.style.fontSize = 'var(--jp-font-size-sm)';
        input.style.transition = 'border-color var(--jp-transition-fast)';
        
        input.addEventListener('focus', () => {
          input.style.borderColor = 'var(--jp-color-primary-500)';
          input.style.outline = 'none';
          input.style.boxShadow = '0 0 0 3px var(--jp-color-primary-100)';
        });
        
        input.addEventListener('blur', () => {
          input.style.borderColor = 'var(--jp-color-gray-300)';
          input.style.boxShadow = 'none';
        });
      }
    });

    // Restyle DataTables length selector
    const dataTablesLength = document.querySelectorAll('.dataTables_length');
    dataTablesLength.forEach(length => {
      length.style.marginBottom = 'var(--jp-space-4)';
      
      const select = length.querySelector('select');
      if (select) {
        select.style.borderRadius = 'var(--jp-radius-md)';
        select.style.border = '1px solid var(--jp-color-gray-300)';
        select.style.padding = 'var(--jp-space-2) var(--jp-space-3)';
        select.style.fontSize = 'var(--jp-font-size-sm)';
      }
    });

    // Restyle DataTables pagination
    const dataTablesPaginate = document.querySelectorAll('.dataTables_paginate');
    dataTablesPaginate.forEach(paginate => {
      paginate.style.marginTop = 'var(--jp-space-4)';
      
      const buttons = paginate.querySelectorAll('.paginate_button');
      buttons.forEach(button => {
        button.style.borderRadius = 'var(--jp-radius-md)';
        button.style.border = '1px solid var(--jp-color-gray-300)';
        button.style.padding = 'var(--jp-space-2) var(--jp-space-3)';
        button.style.margin = '0 var(--jp-space-1)';
        button.style.fontSize = 'var(--jp-font-size-sm)';
        button.style.transition = 'all var(--jp-transition-fast)';
        
        if (button.classList.contains('current')) {
          button.style.background = 'var(--jp-color-primary-500)';
          button.style.color = 'white';
          button.style.borderColor = 'var(--jp-color-primary-500)';
        }
        
        button.addEventListener('mouseenter', () => {
          if (!button.classList.contains('current')) {
            button.style.background = 'var(--jp-color-gray-100)';
          }
        });
        
        button.addEventListener('mouseleave', () => {
          if (!button.classList.contains('current')) {
            button.style.background = 'white';
          }
        });
      });
    });

    // Restyle DataTables info
    const dataTablesInfo = document.querySelectorAll('.dataTables_info');
    dataTablesInfo.forEach(info => {
      info.style.marginTop = 'var(--jp-space-4)';
      info.style.fontSize = 'var(--jp-font-size-sm)';
      info.style.color = 'var(--jp-color-gray-600)';
    });

    // Restyle tables themselves
    const tables = document.querySelectorAll('.dataTable');
    tables.forEach(table => {
      table.style.borderCollapse = 'separate';
      table.style.borderSpacing = '0';
      
      // Restyle headers
      const headers = table.querySelectorAll('th');
      headers.forEach(header => {
        header.style.background = 'var(--jp-color-gray-50)';
        header.style.color = 'var(--jp-color-gray-700)';
        header.style.fontWeight = 'var(--jp-font-weight-semibold)';
        header.style.padding = 'var(--jp-space-3) var(--jp-space-4)';
        header.style.borderBottom = '2px solid var(--jp-color-gray-200)';
      });
      
      // Restyle cells
      const cells = table.querySelectorAll('td');
      cells.forEach(cell => {
        cell.style.padding = 'var(--jp-space-3) var(--jp-space-4)';
        cell.style.borderBottom = '1px solid var(--jp-color-gray-200)';
        cell.style.color = 'var(--jp-color-gray-800)';
      });
      
      // Alternating row colors
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row, index) => {
        if (index % 2 === 1) {
          row.style.background = 'var(--jp-color-gray-50)';
        }
        row.style.transition = 'background var(--jp-transition-fast)';
        
        row.addEventListener('mouseenter', () => {
          row.style.background = 'var(--jp-color-primary-50)';
        });
        
        row.addEventListener('mouseleave', () => {
          if (index % 2 === 1) {
            row.style.background = 'var(--jp-color-gray-50)';
          } else {
            row.style.background = 'transparent';
          }
        });
      });
    });

    // Restyle top header bar
    const headerTopMenu = document.querySelector('.header-top-menu');
    if (headerTopMenu) {
      headerTopMenu.style.background = 'white';
      headerTopMenu.style.borderRadius = 'var(--jp-radius-lg)';
      headerTopMenu.style.boxShadow = 'var(--jp-shadow-sm)';
      headerTopMenu.style.padding = 'var(--jp-space-3)';
      headerTopMenu.style.marginTop = 'var(--jp-space-4)';
    }

    // Restyle nav items in header
    const headerNavItems = document.querySelectorAll('.header-top-menu .nav-item');
    headerNavItems.forEach(item => {
      const link = item.querySelector('a');
      if (link) {
        link.style.padding = 'var(--jp-space-2) var(--jp-space-3)';
        link.style.borderRadius = 'var(--jp-radius-md)';
        link.style.transition = 'all var(--jp-transition-fast)';
        
        link.addEventListener('mouseenter', () => {
          link.style.background = 'var(--jp-color-gray-100)';
        });
        
        link.addEventListener('mouseleave', () => {
          link.style.background = 'transparent';
        });
      }
    });

    // Restyle dropdown menus
    const dropdownMenus = document.querySelectorAll('.dropdown-menu');
    dropdownMenus.forEach(menu => {
      menu.style.borderRadius = 'var(--jp-radius-lg)';
      menu.style.boxShadow = 'var(--jp-shadow-lg)';
      menu.style.border = '1px solid var(--jp-color-gray-200)';
      menu.style.padding = 'var(--jp-space-2)';
      
      const menuItems = menu.querySelectorAll('a');
      menuItems.forEach(menuItem => {
        menuItem.style.padding = 'var(--jp-space-2) var(--jp-space-3)';
        menuItem.style.borderRadius = 'var(--jp-radius-md)';
        menuItem.style.transition = 'background var(--jp-transition-fast)';
        menuItem.style.display = 'block';
        
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = 'var(--jp-color-gray-100)';
        });
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
      });
    });

    // Restyle profile dropdown items
    const profileItems = document.querySelectorAll('.hd-mg-tt');
    profileItems.forEach(item => {
      const link = item.querySelector('a');
      if (link) {
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.gap = 'var(--jp-space-2)';
        link.style.padding = 'var(--jp-space-2) var(--jp-space-3)';
        link.style.borderRadius = 'var(--jp-radius-md)';
        link.style.transition = 'background var(--jp-transition-fast)';
        
        link.addEventListener('mouseenter', () => {
          link.style.background = 'var(--jp-color-gray-100)';
        });
        
        link.addEventListener('mouseleave', () => {
          link.style.background = 'transparent';
        });
      }
    });

    console.log('[JawwalPay UX+] Dashboard page enhanced successfully');

  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing dashboard page:', error);
  }
}

// Export for loader
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { enhanceMainPage };
}

// Auto-execute when loaded
enhanceMainPage();
