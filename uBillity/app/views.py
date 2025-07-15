from rest_framework import viewsets
from .models import Bill
from .serializers import BillSerializer

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer

# Create
def bill_create(request):
    if request.method == 'POST':
        form = BillForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('bill_list')
    else:
        form = BillForm()
    return render(request, 'templates/bill_form.html', {'form': form})

# Read (List View)
def bill_list(request):
    bills = Bill.objects.all()
    return render(request, 'templates/bill_list.html', {'bills': bills})

# Read (Detail View)
def bill_detail(request, pk):
    bill = get_object_or_404(Bill, pk=pk)
    return render(request, 'templates/bill_detail.html', {'bill': bill})

# Update
def bill_update(request, pk):
    bill = get_object_or_404(Bill, pk=pk)
    if request.method == 'POST':
        form = BillForm(request.POST, instance=bill)
        if form.is_valid():
            form.save()
            return redirect('bill_detail', pk=bill.pk)
    else:
        form = BillForm(instance=bill)
    return render(request, 'templates/bill_form.html', {'form': form})

# Delete
def bill_delete(request, pk):
    bill = get_object_or_404(Bill, pk=pk)
    if request.method == 'POST':
        bill.delete()
        return redirect('bill_list')
    return render(request, 'templates/bill_confirm_delete.html', {'bill': bill})
