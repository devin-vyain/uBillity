# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from app.views import BillViewSet
from django.contrib import admin

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')

urlpatterns = [
    path('admin/', admin.site.urls),  # Optional
    path('api/', include(router.urls)),
    path('api/login/', obtain_auth_token),
]
