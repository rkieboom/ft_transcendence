/* Materia UI */
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import MessageIcon from '@mui/icons-material/Message';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../../../context/socket';
import { User } from './Channels';

const PublicGroup: React.FC<{
	user: User;
	open: boolean;
	setOpen: (open: boolean) => void;
}> = ({ user, open, setOpen }) => {

	const navigate = useNavigate();
	const socket = useContext(SocketContext);

	const [channelName, setChannelName] = useState<string>('');

	const setClose = () => {
		setOpen(false);
	};

	const create = () => {
		/* Parsing chatDialogPassword and chatDialogName */
		if (channelName.length < 3) {
			alert('Group name must be at least 3 characters long.');
			return;
		}
		if (channelName.length > 20) {
			alert('Group name must be at most 20 characters long.');
			return;
		}
		if (channelName.includes(' ')) {
			alert('Group name must not contain spaces.');
			return;
		}

		/* Create channel */
		const payload = {
			name: channelName,
			type: 'GROUP',
		};

		axios.post('http://localhost:3000/chat/' + user?.id + '/create', payload, { withCredentials: true })
		.then(res => {
			if (socket)
				socket.emit('chat/join', { chatID: res.data.id });
			alert('Group created successfully.');
			setOpen(false);
		})
		.catch(err => {
			if (err.response.data.statusCode === 401)
				navigate('/login');
			alert(err.response.data.message)
		});
		setChannelName('');
	}

	return (
		<>

			{ !socket && <CircularProgress /> }
			{
				socket && 
				<Dialog open={open} onClose={setClose}>
					<DialogTitle>Create Group</DialogTitle>
					<DialogContent>
						<DialogContentText>
							Create a new group without a password.
						</DialogContentText>
						<TextField
							autoFocus
							margin="dense"
							id="groupname"
							label="Group Name"
							type="text"
							required={true}
							fullWidth
							onChange={event => setChannelName(event.currentTarget.value)}
							variant="standard"
							/>
					</DialogContent>
					<DialogActions>
						<Button onClick={setClose} color='error'>Cancel</Button>
						<Button onClick={create} color='success'>Create</Button>
					</DialogActions>
				</Dialog>
			}
		</>
	);
}
export default PublicGroup;