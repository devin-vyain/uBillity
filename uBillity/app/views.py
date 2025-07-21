from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import Bill
from .serializers import BillSerializer
from datetime import timedelta
from dateutil.relativedelta import relativedelta
import uuid

debug = True

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer

    def perform_create(self, serializer):
        recurrence = serializer.validated_data.get('recurrence')
        recurrence_id = uuid.uuid4() if recurrence != 'none' else None

        bill = serializer.save(recurrence_id=recurrence_id)

        if recurrence != 'none':
            freq_map = {
                'daily': timedelta(days=1),
                'weekly': timedelta(weeks=1),
                'biweekly': timedelta(weeks=2),
                'monthly': relativedelta(months=1),
                'bimonthly': relativedelta(months=2),
                'annually': relativedelta(years=1),
            }

            iteration_map = {
                'daily': 180,
                'weekly': 26,
                'biweekly': 13,
                'monthly': 6,
                'bimonthly': 3,
                'annually': 1,
            }

            delta = freq_map[recurrence]
            iteration = iteration_map[recurrence]
            start_date = bill.due_date
            future_instances = []

            for i in range(1, iteration):
                new_due_date = start_date + (delta * i)
                future_instances.append(Bill(
                    name=bill.name,
                    amount=bill.amount,
                    description=bill.description,
                    due_date=new_due_date,
                    type=bill.type,
                    category=bill.category,
                    reconciled=False,
                    recurrence=recurrence,
                    recurrence_id=recurrence_id,
                ))

            Bill.objects.bulk_create(future_instances)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_series = request.query_params.get('delete_series', 'false').lower() == 'true'
        if debug:
            print("Delete series param:", delete_series)

        if delete_series and instance.recurrence_id:
            Bill.objects.filter(recurrence_id=instance.recurrence_id).delete()
            if debug:
                print(f"Deleting series with recurrence_id {instance.recurrence_id}")
        else:
            instance.delete()
            if debug:
                print(f"Deleting single bill with id {instance.id}")

        return Response(status=status.HTTP_204_NO_CONTENT)
