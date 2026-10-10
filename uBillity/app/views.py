from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Bill, Household, HouseholdMembership
from .serializers import BillSerializer, HouseholdSerializer
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from rest_framework.exceptions import PermissionDenied
from .models import HouseholdMembership
import uuid

class HouseholdViewSet(viewsets.ModelViewSet):
    serializer_class = HouseholdSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        return Household.objects.filter(members=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_update(self, serializer):
        household = self.get_object()
        is_default = HouseholdMembership.objects.filter(
            user=self.request.user, household=household, is_default=True
        ).exists()
        if not is_default:
            raise PermissionDenied("You can only rename your default household.")
        serializer.save()

    def perform_create(self, serializer):
        household = serializer.save()
        HouseholdMembership.objects.create(
            user=self.request.user,
            household=household,
            is_default=not self.request.user.household_memberships.exists(),
        )

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        household = self.get_object()
        HouseholdMembership.objects.filter(user=request.user).update(is_default=False)
        HouseholdMembership.objects.filter(user=request.user, household=household).update(is_default=True)
        return Response(self.get_serializer(household).data)

    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        household = self.get_object()  # 404s if requester isn't a member — good, only members can invite
        username = request.data.get('username')
        if not username:
            return Response({'detail': 'username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invited_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'No user with that username.'}, status=status.HTTP_404_NOT_FOUND)

        membership, created = HouseholdMembership.objects.get_or_create(
            user=invited_user,
            household=household,
            defaults={'is_default': not invited_user.household_memberships.exists()},
        )
        if not created:
            return Response({'detail': 'User is already a member of this household.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': f'{username} added to {household.name}.'}, status=status.HTTP_201_CREATED)


class BillViewSet(viewsets.ModelViewSet):
    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Bill.objects.visible_to(self.request.user)
        household_id = self.request.query_params.get('household')
        if household_id:
            queryset = queryset.filter(household_id=household_id)
        return queryset

    def perform_create(self, serializer):
        household = serializer.validated_data.get('household')
        if not household:
            membership = self.request.user.household_memberships.filter(is_default=True).first()
            if not membership:
                membership = self.request.user.household_memberships.first()
            household = membership.household if membership else None

        recurrence = serializer.validated_data.get('recurrence')
        recurrence_id = uuid.uuid4() if recurrence != 'none' else None

        bill = serializer.save(
            recurrence_id=recurrence_id,
            household=household,
            created_by=self.request.user,
        )

        if recurrence != 'none':
            freq_map = {
                'daily': timedelta(days=1), 'weekly': timedelta(weeks=1),
                'biweekly': timedelta(weeks=2), 'monthly': relativedelta(months=1),
                'bimonthly': relativedelta(months=2), 'annually': relativedelta(years=1),
            }
            iteration_map = {'daily': 180, 'weekly': 26, 'biweekly': 13, 'monthly': 6, 'bimonthly': 3, 'annually': 1}
            delta = freq_map[recurrence]
            iteration = iteration_map[recurrence]
            start_date = bill.due_date
            future_instances = []
            for i in range(1, iteration):
                new_due_date = start_date + (delta * i)
                future_instances.append(Bill(
                    name=bill.name, amount=bill.amount, description=bill.description,
                    due_date=new_due_date, type=bill.type, category=bill.category,
                    reconciled=False, recurrence=recurrence, recurrence_id=recurrence_id,
                    household=bill.household, created_by=bill.created_by,
                ))
            Bill.objects.bulk_create(future_instances)

    @action(detail=False, methods=['put'], url_path=r'series/(?P<recurrence_id>[^/.]+)')
    def update_series(self, request, recurrence_id=None):
        bills = list(self.get_queryset().filter(recurrence_id=recurrence_id))
        if not bills:
            return Response(
                {'detail': 'Series not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        series_data = {k: v for k, v in request.data.items() if k != 'due_date'}

        serializers = [
            self.get_serializer(bill, data=series_data, partial=True)
            for bill in bills
        ]
        for bill_serializer in serializers:
            bill_serializer.is_valid(raise_exception=True)
        for bill_serializer in serializers:
            bill_serializer.save()

        return Response(
            self.get_serializer(bills, many=True).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_series = request.query_params.get('delete_series', 'false').lower() == 'true'
        if delete_series and instance.recurrence_id:
            self.get_queryset().filter(recurrence_id=instance.recurrence_id).delete()
        else:
            instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)