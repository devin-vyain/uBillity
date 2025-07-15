# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from app.views import BillViewSet

router = DefaultRouter()
router.register(r'bills', BillViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
