import uuid
from datetime import date

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Bill, Household, HouseholdMembership


class BillSeriesUpdateTests(APITestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(username='series-editor')
		self.household = Household.objects.create(name='Test household')
		HouseholdMembership.objects.create(
			user=self.user,
			household=self.household,
			is_default=True,
		)
		self.recurrence_id = uuid.uuid4()
		self.bills = [
			Bill.objects.create(
				name='Original bill',
				amount=10,
				due_date=date(2026, month, 1),
				type='expense',
				recurrence='monthly',
				recurrence_id=self.recurrence_id,
				household=self.household,
				created_by=self.user,
			)
			for month in (1, 2)
		]
		self.client.force_authenticate(user=self.user)

	def test_put_updates_every_entry_in_series(self):
		response = self.client.put(
			f'/api/bills/series/{self.recurrence_id}/',
			{
				'id': self.bills[0].id,
				'name': 'Updated bill',
				'description': '',
				'amount': 25,
				'type': 'expense',
				'category': None,
				'due_date': '2026-01-01',
				'reconciled': False,
				'recurrence': 'monthly',
				'recurrence_id': str(self.recurrence_id),
				'household': self.household.id,
			},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data), 2)
		updated_bills = list(Bill.objects.filter(recurrence_id=self.recurrence_id).order_by('due_date'))
		self.assertEqual([bill.name for bill in updated_bills], ['Updated bill', 'Updated bill'])
		self.assertEqual([bill.amount for bill in updated_bills], [25, 25])
		self.assertEqual([bill.due_date for bill in updated_bills], [date(2026, 1, 1), date(2026, 2, 1)])
