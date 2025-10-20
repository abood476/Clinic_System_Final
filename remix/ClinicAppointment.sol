// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ClinicAppointment {
    struct Appointment {
        uint id;
        string patientName;
        string doctorName;
        string date;
        bool confirmed;
    }

    mapping(uint => Appointment) public appointments;
    uint public appointmentCount;

    event AppointmentCreated(uint id, string patientName, string doctorName, string date);
    event AppointmentConfirmed(uint id);

    // ✅ إنشاء موعد جديد
    function createAppointment(
        string memory _patientName,
        string memory _doctorName,
        string memory _date
    ) public {
        appointmentCount++;
        appointments[appointmentCount] = Appointment(
            appointmentCount,
            _patientName,
            _doctorName,
            _date,
            false
        );
        emit AppointmentCreated(appointmentCount, _patientName, _doctorName, _date);
    }

    // ✅ تأكيد الموعد
    function confirmAppointment(uint _id) public {
        require(_id > 0 && _id <= appointmentCount, "Invalid appointment ID");
        appointments[_id].confirmed = true;
        emit AppointmentConfirmed(_id);
    }

    // ✅ استرجاع موعد محدد
    function getAppointment(uint _id)
        public
        view
        returns (
            uint,
            string memory,
            string memory,
            string memory,
            bool
        )
    {
        Appointment memory a = appointments[_id];
        return (a.id, a.patientName, a.doctorName, a.date, a.confirmed);
    }

    // ✅ (جديدة) استرجاع كل المواعيد
    function getAllAppointments() public view returns (Appointment[] memory) {
        Appointment[] memory all = new Appointment[](appointmentCount);
        for (uint i = 0; i < appointmentCount; i++) {
            all[i] = appointments[i + 1];
        }
        return all;
    }
}