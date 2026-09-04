include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for JODU5164x
LUCI_DEPENDS:=+luci-base +wget +telnet-bsd +luci-compat
LUCI_PKGARCH:=all

PKG_NAME:=luci-app-jodu5164x-onyx
PKG_VERSION:=1.0.0
PKG_RELEASE:=3
PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=Manish Matwa Choudhary

# Include luci.mk if present in feeds (standard OpenWrt SDK setup)
ifneq ($(wildcard $(TOPDIR)/feeds/luci/luci.mk),)
  include $(TOPDIR)/feeds/luci/luci.mk
else
  include $(INCLUDE_DIR)/package.mk

  define Package/$(PKG_NAME)
    SECTION:=luci
    CATEGORY:=LuCI
    SUBMENU:=3. Applications
    TITLE:=$(LUCI_TITLE)
    DEPENDS:=$(LUCI_DEPENDS)
    PKGARCH:=$(LUCI_PKGARCH)
  endef

  define Package/$(PKG_NAME)/description
    LuCI support for JODU5164x (JODU51641 / JODU51642).
    Provides real-time ODU signal monitoring for OpenWrt.
  endef

  define Build/Configure
  endef

  define Build/Compile
  endef

  define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/
	cp -pR ./root/* $(1)/
	$(INSTALL_DIR) $(1)/www
	cp -pR ./htdocs/* $(1)/www/
	chmod 0755 $(1)/usr/libexec/*
  endef

  define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache /tmp/luci-sessions/*
	/etc/init.d/rpcd reload 2>/dev/null
}
exit 0
  endef

  $(eval $(call BuildPackage,$(PKG_NAME)))
endif

# call BuildPackage - OpenWrt buildroot signature
