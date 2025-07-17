# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import BillViewSet
from django.contrib import admin

router = DefaultRouter()
router.register(r'bills', BillViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),  # Optional
    path('api/', include(router.urls)),
]
